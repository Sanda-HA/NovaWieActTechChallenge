import json
from uuid import uuid4

import pytest

from src.manage import main
from tests.conftest import register

OWNER, GUEST = "eleve01", "invited"


@pytest.fixture
def room(client, auth):
    assert main(["set-plan", OWNER, "pro"]) == 0
    guest = register(client, GUEST)
    assert main(["set-plan", GUEST, "pro"]) == 0
    created = client.post("/groups/rooms", headers=auth, json={"name": "Révisions"}).json()
    client.post("/groups/rooms/join", headers=guest, json={"code": created["invite_code"]})
    return {"guest": guest, "url": f"/groups/rooms/{created['id']}"}


def start(client, auth, room, topic="derivabilite"):
    return client.post(room["url"] + "/session", headers=auth, json={"topic": topic})


def post(client, headers, room, kind, text):
    return client.post(room["url"] + "/posts", headers=headers, json={"kind": kind, "text": text})


def test_only_the_owner_starts_advances_and_ends(client, auth, agent, room):
    guest = room["guest"]
    for path, body in (("/session", {"topic": "derivabilite"}), ("/session/next", None), ("/session/end", None)):
        r = client.post(room["url"] + path, headers=guest, json=body)
        assert r.status_code == 403 and r.json()["detail"] == {"error": "not_room_owner"}
    assert not agent.calls
    assert start(client, auth, room).status_code == 201
    assert client.post(room["url"] + "/session/next", headers=guest).status_code == 403
    assert client.post(room["url"] + "/session/end", headers=guest).status_code == 403
    assert client.get(room["url"] + "/session", headers=guest).status_code == 200


def test_non_members_get_404_everywhere(client, auth, room):
    stranger = register(client, "stranger")
    start(client, auth, room)
    for method, path, body in (
        ("get", "/session", None), ("post", "/session", {"topic": "derivabilite"}),
        ("post", "/session/next", None), ("post", "/session/end", None),
        ("get", "/session/quiz", None), ("patch", "/settings", {"tutor_enabled": True}),
        ("patch", "/consent", {"allow_ai_text": True}), ("get", "/consent", None),
        ("post", "/session/tutor/requests", {"kind": "hint"}),
    ):
        kwargs = {"json": body} if body is not None else {}
        r = getattr(client, method)(room["url"] + path, headers=stranger, **kwargs)
        assert r.status_code == 404 and r.json()["detail"] == {"error": "room_not_found"}


def test_start_uses_a_localized_goal_while_the_agent_is_down(client, auth, agent, room):
    agent.unreachable = True
    r = start(client, auth, room)
    assert r.status_code == 201
    session_id = r.json()["session_id"]
    assert isinstance(session_id, int)
    assert r.json() == {
        "session_id": session_id,
        "topic": "derivabilite", "goal": "Comprendre la dérivabilité.", "round": "explain",
        "notes": [], "my_open_points": [],
    }
    assert client.get(room["url"] + "/session", headers=room["guest"]).json() == r.json()
    again = start(client, auth, room)
    assert again.status_code == 409 and again.json()["detail"] == {"error": "session_active"}


def test_topic_must_be_a_known_slug_without_the_agent(client, auth, agent, room):
    assert start(client, auth, room, topic="Dérivabilité !").status_code == 422
    r = start(client, auth, room, topic="nope")
    assert r.status_code == 404 and r.json()["detail"] == {"error": "unknown_topic"}
    assert client.get(room["url"] + "/session", headers=auth).status_code == 404
    assert agent.calls == []


def test_no_session_is_404_no_session(client, auth, room):
    r = client.get(room["url"] + "/session", headers=room["guest"])
    assert r.status_code == 404 and r.json()["detail"] == {"error": "no_session"}
    for path in ("/session/next", "/session/end"):
        r = client.post(room["url"] + path, headers=auth)
        assert r.status_code == 404 and r.json()["detail"] == {"error": "no_session"}


def test_rounds_advance_and_end_with_local_review_notes(client, auth, agent, room):
    assert start(client, auth, room).status_code == 201
    rounds = [client.post(room["url"] + "/session/next", headers=auth).json()["round"] for _ in range(3)]
    assert rounds == ["question", "quiz", "ended"]
    ended = client.get(room["url"] + "/session", headers=room["guest"]).json()
    assert ended["round"] == "ended" and ended["notes"]
    assert agent.calls == []
    for path in ("/session/next", "/session/end"):
        r = client.post(room["url"] + path, headers=auth)
        assert r.status_code == 409 and r.json()["detail"] == {"error": "session_ended"}


def test_session_open_points_are_actionable_and_caller_owned(client, auth, agent, room):
    post(client, auth, room, "explanation", "Avant la séance.")
    assert start(client, auth, room).status_code == 201
    post(client, auth, room, "explanation", "Pendant la séance.")
    post(client, room["guest"], room, "explanation", "Explication de l'invité.")
    post(client, auth, room, "question", "Ma question anonyme.")
    assert client.post(room["url"] + "/session/end", headers=auth).status_code == 200
    mine = client.get(room["url"] + "/session", headers=auth).json()["my_open_points"]
    assert [(p["text"], p["verdict"]) for p in mine] == [("Pendant la séance.", None)]
    assert mine[0]["review_action"]
    theirs = client.get(room["url"] + "/session", headers=room["guest"]).json()["my_open_points"]
    assert [p["text"] for p in theirs] == ["Explication de l'invité."]
    assert OWNER not in json.dumps(mine) and GUEST not in json.dumps(mine)
    assert agent.calls == []


def test_a_new_session_can_start_once_the_previous_one_ended(client, auth, room):
    start(client, auth, room)
    client.post(room["url"] + "/session/end", headers=auth)
    r = start(client, auth, room, topic="suites")
    assert r.status_code == 201 and r.json()["round"] == "explain" and r.json()["notes"] == []


def test_room_check_is_localized_and_legacy_uuid_cannot_bypass_membership(client, auth, agent, room):
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    payload = {"explanation": "A private explanation."}
    checked = client.post(room["url"] + "/check", headers=auth, json=payload)
    assert checked.status_code == 200
    assert checked.json()["verdict"] == "unknown"
    assert checked.json()["checklist"] and "example" in " ".join(checked.json()["checklist"]).lower()
    alias = "/groups/" + room["url"].split("/")[-1] + "/check"
    assert client.post(alias, headers=auth, json=payload).json() == checked.json()
    stranger = register(client, "stranger")
    assert client.post(alias, headers=stranger, json=payload).status_code == 404
    assert client.post(f"/groups/{uuid4()}/check", headers=auth, json=payload).status_code == 404
    assert agent.calls == []


def test_room_quiz_uses_stable_practice_questions_without_an_agent(client, auth, agent, room):
    assert start(client, auth, room).status_code == 201
    url = room["url"] + "/session"
    assert client.get(url + "/quiz", headers=auth).status_code == 409
    for _ in range(2):
        client.post(url + "/next", headers=auth)
    responses = [client.get(url + "/quiz", headers=h) for h in (auth, auth, room["guest"])]
    assert [res.status_code for res in responses] == [200, 200, 200]
    quizzes = [res.json() for res in responses]
    assert quizzes[0]["questions"] and all(q["questions"] == quizzes[0]["questions"] for q in quizzes)
    assert all(q["language"] == "fr" for q in quizzes)
    assert len({q["quiz_id"] for q in quizzes}) == 3
    assert all("answer_index" not in q for q in quizzes[0]["questions"])
    assert agent.calls == []


def test_room_quiz_reports_the_fallback_language_when_a_practice_translation_is_missing(client, auth, agent, room):
    guest = room["guest"]
    assert client.put("/me/profile", headers=guest, json={"reply_language": "en"}).status_code == 200
    assert start(client, auth, room, topic="suites").status_code == 201
    url = room["url"] + "/session"
    for _ in range(2):
        assert client.post(url + "/next", headers=auth).status_code == 200
    fallback = client.get(url + "/quiz", headers=guest)
    reference = client.get(url + "/quiz", headers=auth)
    assert fallback.status_code == 200
    assert fallback.json()["language"] == "fr"
    assert fallback.json()["questions"] == reference.json()["questions"]
    assert agent.calls == []


AI_VERDICT = {
    "verdict": "incomplete", "issue": "La condition de continuité manque.",
    "guiding_question": "Que se passe-t-il en 0 ?",
    "missing_points": ["Continuité en un point", "Limite à gauche et à droite"],
    "restate_prompt": "Réexpliquez avec ces points.",
    "source": {"chunk_id": "math_4sc_derivee_001", "source": "Manuel", "page": 41},
}


def enable_ai_check(client, room, auth, monkeypatch, *, consent=True, deployment=True):
    if deployment:
        monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    else:
        monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT", raising=False)
    assert client.patch(room["url"] + "/consent", headers=auth, json={"allow_ai_text": consent}).status_code == 200


def room_check(client, room, auth, text="Dérivable implique continue."):
    return client.post(room["url"] + "/check", headers=auth, json={"explanation": text})


def test_check_evaluates_the_text_with_consent_and_deployment_flag(client, auth, agent, room, monkeypatch):
    import httpx

    agent.responses["/group/check"] = httpx.Response(200, json=AI_VERDICT)
    enable_ai_check(client, room, auth, monkeypatch)
    checked = room_check(client, room, auth)
    assert checked.status_code == 200, checked.text
    body = checked.json()
    assert body["mode"] == "ai" and body["fallback_reason"] is None
    assert body["verdict"] == "incomplete"
    assert body["summary"] == AI_VERDICT["issue"]
    assert body["missing_points"] == AI_VERDICT["missing_points"]
    assert body["point_feedback"] == [{"point": p, "status": "missing"} for p in AI_VERDICT["missing_points"]]
    assert body["guiding_question"] == AI_VERDICT["guiding_question"]
    assert body["source"]["chunk_id"] == "math_4sc_derivee_001"
    assert body["checklist"]
    sent = agent.last("/group/check")
    assert sent["explanation"] == "Dérivable implique continue."
    assert room["url"].split("/")[-1] not in json.dumps(sent) and OWNER not in json.dumps(sent)
    alias = client.post("/groups/" + room["url"].split("/")[-1] + "/check", headers=auth, json={"explanation": "x"})
    assert alias.json()["mode"] == "ai"


@pytest.mark.parametrize(("consent", "deployment", "reason"), [
    (False, True, "consent_required"), (True, False, "raw_text_disabled"),
])
def test_check_keeps_the_text_local_without_consent_or_deployment_flag(
    client, auth, agent, room, monkeypatch, consent, deployment, reason,
):
    enable_ai_check(client, room, auth, monkeypatch, consent=consent, deployment=deployment)
    body = room_check(client, room, auth).json()
    assert body["mode"] == "checklist" and body["fallback_reason"] == reason
    assert body["verdict"] == "unknown" and body["checklist"] and body["missing_points"] == body["checklist"]
    assert body["summary"] == "" and body["point_feedback"] == []
    assert agent.calls == []


def test_check_never_sends_text_for_a_member_who_lost_pro(client, auth, agent, room, monkeypatch):
    enable_ai_check(client, room, auth, monkeypatch)
    assert main(["set-plan", OWNER, "free"]) == 0
    body = room_check(client, room, auth).json()
    assert body["mode"] == "checklist" and body["fallback_reason"] == "pro_required"
    assert agent.calls == []


def test_check_requires_pro_while_a_session_runs(client, auth, agent, room, monkeypatch):
    enable_ai_check(client, room, auth, monkeypatch)
    assert start(client, auth, room).status_code == 201
    assert main(["set-plan", OWNER, "free"]) == 0
    assert room_check(client, room, auth).status_code == 403
    assert agent.calls == []


@pytest.mark.parametrize("failure", ["unreachable", "busy", "server_error", "malformed", "timeout"])
def test_check_falls_back_to_the_checklist_when_the_model_fails(client, auth, agent, room, monkeypatch, failure):
    import httpx

    from src.ai.interface import AgentClient, get_agent
    from src.main import app

    enable_ai_check(client, room, auth, monkeypatch)
    if failure == "unreachable":
        agent.unreachable = True
    elif failure == "busy":
        agent.responses["/group/check"] = httpx.Response(503, json={"detail": {"retry_after": 3}})
    elif failure == "server_error":
        agent.responses["/group/check"] = httpx.Response(500, json={})
    elif failure == "malformed":
        agent.responses["/group/check"] = httpx.Response(200, json={"verdict": "maybe"})
    else:

        monkeypatch.setattr("src.groups.room_check.CHECK_TIMEOUT_S", 0.05)

        class Stalled(httpx.AsyncBaseTransport):
            async def handle_async_request(self, request):
                import asyncio

                await asyncio.sleep(1)
                return httpx.Response(200, json=AI_VERDICT)

        app.dependency_overrides[get_agent] = lambda: AgentClient("http://agent", transport=Stalled())
    checked = room_check(client, room, auth)
    assert checked.status_code == 200, checked.text
    body = checked.json()
    assert body["mode"] == "checklist" and body["fallback_reason"] == "agent_unavailable"
    assert body["checklist"] and body["verdict"] == "unknown"
