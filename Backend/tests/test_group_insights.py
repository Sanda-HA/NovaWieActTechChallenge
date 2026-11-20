from tests.conftest import register


def test_helpfulness_requires_three_opted_in_votes_and_tracks_withdrawal(client, auth, db):
    from src.manage import main

    assert main(["set-plan", "eleve01", "pro"]) == 0
    room = client.post("/groups/rooms", headers=auth, json={"name": "Feynman"}).json()
    path = f"/groups/rooms/{room['id']}"
    members = [register(client, f"voter{i}") for i in range(3)]
    for headers in members:
        assert client.post("/groups/rooms/join", headers=headers, json={"code": room["invite_code"]}).status_code == 200
    for i, headers in enumerate(members):
        assert main(["set-plan", f"voter{i}", "pro"]) == 0
        assert client.patch(f"{path}/consent", headers=headers, json={"allow_group_insights": True}).status_code == 200
    assert client.post(f"{path}/session", headers=auth, json={"topic": "derivabilite"}).status_code == 201
    post = client.post(f"{path}/posts", headers=auth, json={"kind": "explanation", "text": "La pente locale."}).json()
    vote_path = f"{path}/session/posts/{post['id']}/helpfulness"
    insight_path = f"{path}/session/insights"
    for index, headers in enumerate(members):
        vote = client.put(vote_path, headers=headers, json={"helpful": True, "format": "examples"})
        assert vote.status_code == 204, vote.text
        insights = client.get(insight_path, headers=auth).json()
        expected = [] if index < 2 else [{"concept": "derivabilite", "format": "examples"}]
        assert insights["helpful_formats"] == expected
    assert client.patch(f"{path}/consent", headers=members[-1], json={"allow_group_insights": False}).status_code == 200
    assert client.get(insight_path, headers=auth).json()["helpful_formats"] == []


def _room_with_voter(client, auth):
    from src.manage import main

    assert main(["set-plan", "eleve01", "pro"]) == 0
    room = client.post("/groups/rooms", headers=auth, json={"name": "Feynman"}).json()
    path = f"/groups/rooms/{room['id']}"
    voter = register(client, "voter0")
    assert client.post("/groups/rooms/join", headers=voter, json={"code": room["invite_code"]}).status_code == 200
    assert main(["set-plan", "voter0", "pro"]) == 0
    assert client.patch(f"{path}/consent", headers=voter, json={"allow_group_insights": True}).status_code == 200
    assert client.post(f"{path}/session", headers=auth, json={"topic": "derivabilite"}).status_code == 201
    return path, voter


def test_explanation_format_is_stored_exposed_and_validated(client, auth):
    path, voter = _room_with_voter(client, auth)
    posts = f"{path}/posts"
    typed = client.post(posts, headers=auth, json={"kind": "explanation", "text": "Un schéma.", "format": "visual"})
    assert typed.status_code == 201 and typed.json()["format"] == "visual"
    plain = client.post(posts, headers=auth, json={"kind": "explanation", "text": "Sans format."}).json()
    assert plain["format"] is None
    question = {"kind": "question", "text": "Pourquoi ?", "format": "visual"}
    assert client.post(posts, headers=auth, json=question).status_code == 422
    assert client.post(posts, headers=auth, json={"kind": "explanation", "text": "x", "format": "poem"}).status_code == 422
    listed = {p["id"]: p["format"] for p in client.get(posts, headers=voter).json()}
    assert listed[typed.json()["id"]] == "visual" and listed[plain["id"]] is None


def test_helpfulness_defaults_to_the_posts_format_and_accepts_an_override(client, auth, db):
    from sqlalchemy import text

    path, voter = _room_with_voter(client, auth)
    post = client.post(
        f"{path}/posts", headers=auth, json={"kind": "explanation", "text": "Un exemple.", "format": "examples"},
    ).json()
    vote_path = f"{path}/session/posts/{post['id']}/helpfulness"

    def formats():
        db.rollback()
        query = text("SELECT explanation_format FROM group_concept_evidence WHERE signal = 'helpful'")
        return [row[0] for row in db.execute(query)]

    assert client.put(vote_path, headers=voter, json={"helpful": True}).status_code == 204
    assert formats() == ["examples"]
    assert client.put(vote_path, headers=voter, json={"helpful": True, "format": "analogy"}).status_code == 204
    assert formats() == ["analogy"]


def test_helpfulness_without_any_known_format_is_refused(client, auth):
    path, voter = _room_with_voter(client, auth)
    post = client.post(f"{path}/posts", headers=auth, json={"kind": "explanation", "text": "Sans format."}).json()
    refused = client.put(f"{path}/session/posts/{post['id']}/helpfulness", headers=voter, json={"helpful": True})
    assert refused.status_code == 422 and refused.json()["detail"] == {"error": "format_required"}
