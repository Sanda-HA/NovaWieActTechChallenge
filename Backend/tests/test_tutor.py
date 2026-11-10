import json

import httpx
from sqlalchemy import select

from src.auth.models import User
from src.tutor.models import ChatTurn
from src.utils import learner_pseudonym
from tests.conftest import chat_response, register

QUESTION = "Qu est ce que la probabilite conditionnelle de A sachant B ?"


def new_session(client, auth) -> str:
    r = client.post("/tutor/sessions", headers=auth)
    assert r.status_code == 201
    return r.json()["id"]


def ask(client, auth, sid, **body):
    return client.post(f"/tutor/sessions/{sid}/messages", headers=auth, json={"message": QUESTION, **body})


def test_create_and_list_sessions(client, auth):
    sid = new_session(client, auth)
    sessions = client.get("/tutor/sessions", headers=auth).json()
    assert [s["id"] for s in sessions] == [sid]
    assert sessions[0]["message_count"] == 0 and sessions[0]["topic"] is None


def test_session_subject_is_validated_and_overrides_the_profile(client, auth, agent):
    assert client.post("/tutor/sessions", headers=auth, json={"subject": "invalid"}).status_code == 422
    response = client.post("/tutor/sessions", headers=auth, json={"subject": "physics"})
    assert response.status_code == 201 and response.json()["subject"] == "physics"
    assert ask(client, auth, response.json()["id"]).status_code == 200
    assert agent.last("/chat")["subject"] == "physics"
    assert agent.last("/chat")["subject_selected"] is True
    assert client.get("/me/profile", headers=auth).json()["subject"] == "math"
    assert ask(client, auth, new_session(client, auth)).status_code == 200
    assert agent.last("/chat")["subject"] == "math"
    assert "subject_selected" not in agent.last("/chat")


def test_message_goes_through_agent_with_pseudonym_and_profile(client, auth, agent, db):
    client.put("/me/profile", headers=auth, json={"reply_language": "en", "presentation": "reading"})
    sid = new_session(client, auth)
    r = ask(client, auth, sid, mode="guided", action="hint")
    assert r.status_code == 200
    reply = r.json()
    assert reply["badge"] == "course" and reply["sources"][0]["page"] == 12
    assert reply["ai_generated"] is True and reply["label"] == "réponse générée par IA"

    sent = agent.last("/chat")
    user = db.scalar(select(User))
    assert sent["session_id"] == sid
    assert sent["learner_id"] == learner_pseudonym(user.id)
    assert len(sent["learner_id"]) == 32
    assert str(user.id) not in json.dumps(sent) and "eleve01" not in json.dumps(sent)
    assert sent["mode"] == "guided" and sent["action"] == "hint"
    assert sent["preferred_style"] == "step_by_step"
    assert (sent["grade"], sent["section"], sent["subject"], sent["reply_language"]) == (
        "4eme_annee_secondaire",
        "mathematiques",
        "math",
        "en",
    )

    session = client.get("/tutor/sessions", headers=auth).json()[0]
    assert session["message_count"] == 1 and session["topic"] == "probabilites"


def test_only_turn_metadata_is_stored(client, auth, db):
    sid = new_session(client, auth)
    reply = ask(client, auth, sid).json()
    turn = db.scalar(select(ChatTurn))
    assert turn.response_id == reply["response_id"] and turn.badge == "course" and turn.topic == "probabilites"
    assert turn.latency_ms >= 0
    stored = str({c.name: getattr(turn, c.name) for c in ChatTurn.__table__.columns})
    assert QUESTION not in stored and reply["answer"] not in stored


def test_topic_survives_a_turn_without_topic(client, auth, agent):
    sid = new_session(client, auth)
    ask(client, auth, sid)
    agent.responses["/chat"] = httpx.Response(200, json=chat_response(topic=None, badge="wellbeing"))
    ask(client, auth, sid)
    session = client.get("/tutor/sessions", headers=auth).json()[0]
    assert session["message_count"] == 2 and session["topic"] == "probabilites"


def test_cannot_use_someone_elses_session(client, auth, agent):
    sid = new_session(client, auth)
    other = register(client, "eleve02")
    assert ask(client, other, sid).status_code == 404
    assert client.get("/tutor/sessions", headers=other).json() == []
    assert agent.calls == []


def test_message_validation(client, auth):
    sid = new_session(client, auth)
    assert ask(client, auth, sid, message="").status_code == 422
    assert ask(client, auth, sid, mode="exam").status_code == 422
    assert ask(client, auth, sid, message="x" * 2001).status_code == 422


def test_agent_busy_maps_to_503_with_retry_after(client, auth, agent, db):
    sid = new_session(client, auth)
    agent.responses["/chat"] = httpx.Response(503, json={"detail": {"retry_after": 4.2}})
    r = ask(client, auth, sid)
    assert r.status_code == 503
    assert r.json()["detail"] == {"error": "agent_busy", "retry_after": 4.2}
    assert r.headers["retry-after"] == "5"
    assert db.scalar(select(ChatTurn)) is None


def test_agent_unreachable_maps_to_503(client, auth, agent):
    sid = new_session(client, auth)
    agent.unreachable = True
    r = ask(client, auth, sid)
    assert r.status_code == 503 and r.json()["detail"] == {"error": "agent_unavailable"}


def test_agent_422_maps_to_422(client, auth, agent):
    sid = new_session(client, auth)
    agent.responses["/chat"] = httpx.Response(422, json={"detail": [{"msg": "bad"}]})
    r = ask(client, auth, sid)
    assert r.status_code == 422 and r.json()["detail"] == [{"msg": "bad"}]


def test_malformed_agent_object_does_not_write_a_turn(client, auth, agent, db):
    sid = new_session(client, auth)
    agent.responses["/chat"] = httpx.Response(200, json={})
    response = ask(client, auth, sid)
    assert response.status_code == 502
    assert response.json()["detail"] == {"error": "agent_error"}
    assert db.scalar(select(ChatTurn)) is None


def test_stream_relays_events_and_records_turn(client, auth, agent, db):
    sid = new_session(client, auth)
    r = client.post(f"/tutor/sessions/{sid}/messages/stream", headers=auth, json={"message": QUESTION})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    blocks = [b for b in r.text.split("\n\n") if b]
    assert [b.splitlines()[0] for b in blocks] == ["event: stage", "event: result"]
    result = json.loads(blocks[1].splitlines()[1].removeprefix("data: "))
    assert result["ai_generated"] is True and result["badge"] == "course"
    assert agent.last("/chat/events")["session_id"] == sid
    assert db.scalar(select(ChatTurn)).response_id == result["response_id"]


def test_stream_agent_unreachable_is_503_before_streaming(client, auth, agent):
    sid = new_session(client, auth)
    agent.unreachable = True
    r = client.post(f"/tutor/sessions/{sid}/messages/stream", headers=auth, json={"message": QUESTION})
    assert r.status_code == 503 and r.json()["detail"] == {"error": "agent_unavailable"}


def test_feedback_only_for_own_responses(client, auth, agent):
    sid = new_session(client, auth)
    response_id = ask(client, auth, sid).json()["response_id"]
    body = {"response_id": response_id, "helpful": False, "reason": "unclear"}
    assert client.post("/tutor/feedback", headers=auth, json=body).status_code == 200
    assert agent.last("/feedback") == body

    other = register(client, "eleve02")
    assert client.post("/tutor/feedback", headers=other, json=body).status_code == 404
    assert client.post("/tutor/feedback", headers=auth, json={**body, "reason": "nul"}).status_code == 422
    assert len([c for c in agent.calls if c[1] == "/feedback"]) == 1

def test_invalid_typed_turn_preserves_json_and_stream_errors(client, auth, agent, db):
    sid = new_session(client, auth)
    bad = chat_response(receipt="invalid")
    agent.responses["/chat"] = httpx.Response(200, json=bad)
    assert ask(client, auth, sid).status_code == 502
    agent.responses["/chat/events"] = httpx.Response(
        200, text="event: result\ndata: " + json.dumps(bad) + "\n\n",
        headers={"content-type": "text/event-stream"},
    )
    response = client.post(f"/tutor/sessions/{sid}/messages/stream", headers=auth, json={"message": QUESTION})
    assert "event: error" in response.text
    assert json.loads(response.text.split("data: ")[1]) == {"error": "agent_error"}
    assert db.scalar(select(ChatTurn)) is None
