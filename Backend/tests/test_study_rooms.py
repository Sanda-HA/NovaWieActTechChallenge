from tests.conftest import register


def room_with_guest(client, auth):
    guest = register(client, "invited")
    room = client.post("/groups/rooms", headers=auth, json={"name": "Révisions"}).json()
    client.post("/groups/rooms/join", headers=guest, json={"code": room["invite_code"]})
    return guest, f"/groups/rooms/{room['id']}/posts"


def test_room_lifecycle_and_membership(client, auth, agent):
    guest = register(client, "invited")
    stranger = register(client, "stranger")
    base = "/groups/rooms"
    assert client.get(base).status_code == 401
    assert client.post(base, headers=auth, json={"name": " "}).status_code == 422
    created = client.post(base, headers=auth, json={"name": "  Révisions  "})
    assert created.status_code == 201
    room = created.json()
    assert room["name"] == "Révisions"
    assert room["members"] == ["eleve01"]
    detail = f"{base}/{room['id']}"
    assert client.get(detail, headers=stranger).status_code == 404
    assert client.get(base, headers=guest).json() == []
    assert client.post(detail + "/check", headers=guest, json={"explanation": "Un exemple."}).status_code == 404
    assert not agent.calls
    assert client.post(base + "/join", headers=guest, json={"code": "ZZZZZZ"}).status_code == 404
    for _ in range(2):
        joined = client.post(base + "/join", headers=guest, json={"code": room["invite_code"]})
        assert joined.status_code == 200
        assert joined.json()["members"] == ["eleve01", "invited"]
        assert joined.json()["invite_code"] == room["invite_code"] and joined.json()["owner"] is False
    assert [r["id"] for r in client.get(base, headers=guest).json()] == [room["id"]]
    assert client.post(detail + "/check", headers=guest, json={"explanation": "Un exemple."}).status_code == 200
    assert client.delete(detail, headers=guest).status_code == 204
    assert client.get(detail, headers=guest).status_code == 404
    assert client.get(detail, headers=auth).json()["members"] == ["eleve01"]
    assert client.delete(detail, headers=auth).status_code == 204
    assert client.post(base + "/join", headers=guest, json={"code": room["invite_code"]}).status_code == 404


def test_member_sees_shared_explanation_without_an_automatic_verdict(client, auth, agent):
    guest, url = room_with_guest(client, auth)
    agent.unreachable = True
    created = client.post(url, headers=auth, json={"kind": "explanation", "text": "Dérivable implique continue."})
    assert created.status_code == 201
    assert created.json()["verdict"] is None
    assert created.json()["author"] == "eleve01"
    listed = client.get(url, headers=guest).json()
    assert [(p["kind"], p["text"], p["author"], p["verdict"]) for p in listed] == [
        ("explanation", "Dérivable implique continue.", "eleve01", None)]


def test_anonymous_question_has_no_author(client, auth, agent):
    guest, url = room_with_guest(client, auth)
    created = client.post(url, headers=guest, json={"kind": "question", "text": "C'est quoi une limite ?"})
    assert created.status_code == 201
    assert created.json()["author"] is None and created.json()["verdict"] is None
    assert not [c for c in agent.calls if c[1] == "/group/check"]
    for response in (created, client.get(url, headers=auth)):
        assert "invited" not in response.text


def test_non_member_cannot_read_posts(client, auth):
    _, url = room_with_guest(client, auth)
    stranger = register(client, "stranger")
    assert client.get(url, headers=stranger).status_code == 404
    assert client.post(url, headers=stranger, json={"kind": "question", "text": "Salut"}).status_code == 404
    assert client.get(url).status_code == 401


def test_posts_capped_at_50(client, auth):
    _, url = room_with_guest(client, auth)
    for i in range(55):
        assert client.post(url, headers=auth, json={"kind": "question", "text": f"q{i}"}).status_code == 201
    listed = client.get(url, headers=auth).json()
    assert len(listed) == 50
    assert listed[0]["text"] == "q54" and listed[-1]["text"] == "q5"


def test_post_validation(client, auth):
    _, url = room_with_guest(client, auth)
    assert client.post(url, headers=auth, json={"kind": "other", "text": "x"}).status_code == 422
    assert client.post(url, headers=auth, json={"kind": "question", "text": ""}).status_code == 422


def test_invite_code_is_six_characters_and_joins_case_insensitively(client, auth):
    guest = register(client, "invited")
    room = client.post("/groups/rooms", headers=auth, json={"name": "Révisions"}).json()
    assert len(room["invite_code"]) == 6
    assert set(room["invite_code"]) <= set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    joined = client.post("/groups/rooms/join", headers=guest, json={"code": " " + room["invite_code"].lower() + " "})
    assert joined.status_code == 200
    assert "invited" in joined.json()["members"]


def test_join_rejects_malformed_codes_and_reports_unknown_ones(client, auth):
    for code in ["ABC", "ABCDEFG", "ABCDE0", "ABCDEI", "", "2d1f6c1e-8a11-4c7e-9b0a-3f6c2f1d9a10"]:
        assert client.post("/groups/rooms/join", headers=auth, json={"code": code}).status_code == 422
    unknown = client.post("/groups/rooms/join", headers=auth, json={"code": "abcdef"})
    assert unknown.status_code == 404
    assert unknown.json()["detail"] == {"error": "invite_not_found"}


def test_members_see_owner_presence_and_the_running_round(client, auth, agent):
    from src.manage import main

    assert main(["set-plan", "eleve01", "pro"]) == 0
    guest = register(client, "invited")
    assert main(["set-plan", "invited", "pro"]) == 0
    room = client.post("/groups/rooms", headers=auth, json={"name": "Révisions"}).json()
    assert room["owner_pseudo"] == "eleve01" and room["active_members"] == ["eleve01"]
    assert room["session_round"] is None
    first = client.post("/groups/rooms/join", headers=guest, json={"code": room["invite_code"]}).json()
    again = client.post("/groups/rooms/join", headers=guest, json={"code": room["invite_code"]}).json()
    assert first["already_member"] is False and again["already_member"] is True
    start = client.post(f"/groups/rooms/{room['id']}/session", headers=auth, json={"topic": "derivabilite"})
    assert start.status_code == 201
    seen = client.get(f"/groups/rooms/{room['id']}", headers=guest).json()
    assert seen["session_round"] == "explain"
    assert seen["active_members"] == ["eleve01", "invited"]


def test_closed_room_reports_room_not_found_to_members(client, auth):
    guest, url = room_with_guest(client, auth)
    room_url = url.removesuffix("/posts")
    assert client.delete(room_url, headers=auth).status_code == 204
    for path in ("", "/posts", "/session"):
        r = client.get(room_url + path, headers=guest)
        assert r.status_code == 404 and r.json()["detail"] == {"error": "room_not_found"}


def test_posts_are_stored_and_deleted_with_their_author(client, auth, db):
    from sqlalchemy import func, select

    from src.groups.models import RoomPost

    guest, url = room_with_guest(client, auth)
    client.post(url, headers=guest, json={"kind": "question", "text": "Question anonyme."})
    client.post(url, headers=auth, json={"kind": "question", "text": "Question du propriétaire."})
    assert db.scalar(select(func.count()).select_from(RoomPost)) == 2
    assert client.delete("/auth/me", headers=guest).status_code == 204
    assert [p["text"] for p in client.get(url, headers=auth).json()] == ["Question du propriétaire."]
