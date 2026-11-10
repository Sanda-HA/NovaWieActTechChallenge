from sqlalchemy import select

from src.auth.models import User
from src.utils import learner_pseudonym


def pseudonym(db):
    return learner_pseudonym(db.scalar(select(User)).id)


def test_diagnostic_items_come_from_agent(client, auth, agent):
    response = client.get("/learning/diagnostic", headers=auth)
    assert response.status_code == 200
    assert response.json()["styles_probe"]["id"] == "s1"
    assert agent.calls[-1][:2] == ("GET", "/diagnostic")


def test_diagnostic_submit_uses_pseudonym(client, auth, agent, db):
    r = client.post("/learning/diagnostic", headers=auth, json={"answers": {"p1": "examples", "l1": "6x"}})
    assert r.status_code == 200
    assert agent.calls[-1] == ("POST", f"/diagnostic/{pseudonym(db)}", {"p1": "examples", "l1": "6x"})


def test_progress_uses_pseudonym(client, auth, agent, db):
    client.get("/learning/progress", headers=auth)
    assert agent.calls[-1][:2] == ("GET", f"/learner/{pseudonym(db)}/progress")


def test_group_check_forwards_profile(client, auth, agent, db):
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    r = client.post("/groups/room_1/check", headers=auth, json={"explanation": "P(A|B) = P(A∩B)/P(B)"})
    assert r.status_code == 200
    assert agent.last("/group/check") == {
        "room_id": "room_1",
        "learner_id": pseudonym(db),
        "explanation": "P(A|B) = P(A∩B)/P(B)",
        "reply_language": "en",
        "grade": "4eme_annee_secondaire",
        "section": "mathematiques",
        "subject": "math",
    }


def test_group_check_validation(client, auth):
    assert client.post("/groups/room_1/check", headers=auth, json={"explanation": ""}).status_code == 422
    assert client.post("/groups/" + "r" * 65 + "/check", headers=auth, json={"explanation": "x"}).status_code == 422


def test_ai_routes_require_auth(client, agent):
    for method, url in [
        ("GET", "/learning/diagnostic"),
        ("GET", "/learning/progress"),
        ("POST", "/tutor/sessions"),
        ("GET", "/study/summary"),
    ]:
        assert client.request(method, url).status_code == 401
    assert client.post("/groups/r/check", json={"explanation": "x"}).status_code == 401
    assert agent.calls == []
