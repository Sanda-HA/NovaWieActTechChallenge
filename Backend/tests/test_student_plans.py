import httpx

from tests.conftest import register


def test_free_is_default_and_learner_cannot_set_plan(client, auth):
    assert client.get("/me/profile", headers=auth).json().get("student_plan") == "free"
    assert client.put("/me/profile", headers=auth, json={"student_plan": "pro"}).status_code == 422
    assert client.post("/auth/register", json={
        "pseudo": "upgrade", "password": "motdepasse-test", "student_plan": "pro",
    }).status_code == 422
    assert client.get("/me/profile", headers=auth).json()["student_plan"] == "free"


def test_operator_changes_existing_login_and_issued_quiz_can_be_finished(client, auth, agent):
    from src.manage import main

    path = "/learning/quiz/derivabilite"
    assert client.get(path, headers=auth).json()["detail"] == {
        "error": "pro_required", "feature": "personal_quiz",
    }
    assert not agent.calls
    assert main(["set-plan", "eleve01", "pro"]) == 0
    assert main(["set-plan", "eleve01", "pro"]) == 0
    assert main(["set-plan", "missing", "pro"]) == 1
    profile = client.put("/me/profile", headers=auth, json={"city": "Tunis"}).json()
    assert profile["student_plan"] == "pro" and profile["city"] == "Tunis"
    quiz = client.get(path, headers=auth)
    assert quiz.status_code == 200
    assert main(["set-plan", "eleve01", "free"]) == 0
    assert client.get(path, headers=auth).status_code == 403
    grade = client.post(f"/learning/quiz/{quiz.json()['quiz_id']}/answers", headers=auth, json={"answers": {}})
    assert grade.status_code == 200


def test_sample_quiz_is_repeatable_and_keeps_answers_server_side(client, auth, agent):
    for _ in range(2):
        response = client.get("/learning/sample-quiz", headers=auth)
        assert response.status_code == 200
        quiz = response.json()
        assert "answer_index" not in response.text
        answers = {q["id"]: 0 for q in quiz["questions"]}
        grade = client.post(f"/learning/quiz/{quiz['quiz_id']}/answers", headers=auth, json={"answers": answers})
        assert grade.status_code == 200
        assert grade.json()["total"] == len(answers)
        assert all(row["explanation"] for row in grade.json()["results"])
    assert not agent.calls


def test_hosting_and_owner_controls_require_current_pro_access(client, auth, agent):
    from src.manage import main

    member = register(client, "guest01")
    room = client.post("/groups/rooms", headers=auth, json={"name": "Math"}).json()
    client.post("/groups/rooms/join", headers=member, json={"code": room["invite_code"]})
    base = f"/groups/rooms/{room['id']}/session"
    room_path = base.removesuffix("/session")
    start = {"topic": "derivabilite"}
    assert client.post(base, headers=auth, json=start).json()["detail"] == {
        "error": "pro_required", "feature": "host_session",
    }
    assert not agent.calls
    main(["set-plan", "eleve01", "pro"])
    assert client.post(base, headers=auth, json=start).status_code == 201
    main(["set-plan", "eleve01", "free"])
    assert client.post(base + "/next", headers=auth).status_code == 403
    assert client.patch(room_path + "/settings", headers=auth, json={"tutor_enabled": True}).status_code == 403
    assert client.get(base, headers=member).status_code == 403
    assert client.get(base + "/quiz", headers=member).status_code == 403
    assert agent.calls == []


def test_free_member_takes_part_in_a_pro_hosted_session(client, auth, agent):
    from src.manage import main

    member = register(client, "guest01")
    stranger = register(client, "stranger")
    main(["set-plan", "eleve01", "pro"])
    room = client.post("/groups/rooms", headers=auth, json={"name": "Math"}).json()
    client.post("/groups/rooms/join", headers=member, json={"code": room["invite_code"]})
    base = f"/groups/rooms/{room['id']}/session"
    room_path = base.removesuffix("/session")
    assert client.post(base, headers=auth, json={"topic": "derivabilite"}).status_code == 201
    assert client.get(base, headers=member).json()["round"] == "explain"
    assert client.get(base + "/quiz", headers=member).status_code == 409
    seen = client.get(room_path, headers=member).json()
    assert seen["session_round"] == "explain"
    posts = room_path + "/posts"
    note = {"kind": "explanation", "text": "The derivative is the tangent slope."}
    assert client.post(posts, headers=member, json=note).status_code == 201
    assert [post["text"] for post in client.get(posts, headers=member).json()] == [note["text"]]
    checked = client.post(room_path + "/check", headers=member, json={"explanation": "An example."})
    assert checked.status_code == 200 and checked.json()["mode"] == "checklist"
    assert client.patch(room_path + "/consent", headers=member, json={"allow_ai_text": True}).status_code == 403
    assert client.patch(room_path + "/consent", headers=member, json={"allow_ai_text": False}).status_code == 200
    assert client.get(base + "/insights", headers=member).status_code == 403
    for _ in range(2):
        assert client.post(base + "/next", headers=auth).status_code == 200
    assert client.get(base + "/quiz", headers=stranger).status_code == 404
    quiz = client.get(base + "/quiz", headers=member)
    assert quiz.status_code == 200 and quiz.json()["topic"] == "derivabilite"
    graded = client.post(f"/learning/quiz/{quiz.json()['quiz_id']}/answers", headers=member, json={"answers": {}})
    assert graded.status_code == 200
    assert client.post(base + "/next", headers=member).status_code == 403
    assert client.post(base + "/end", headers=member).status_code == 403
    main(["set-plan", "eleve01", "free"])
    assert client.get(base, headers=member).status_code == 403
    assert agent.calls == []


def test_free_members_cannot_start_or_join_duels(client, auth):
    from src.manage import main

    guest = register(client, "guest01")
    room = client.post("/groups/rooms", headers=auth, json={"name": "Math"}).json()
    root = f"/groups/rooms/{room['id']}"
    assert client.post("/groups/rooms/join", headers=guest, json={"code": room["invite_code"]}).status_code == 200
    path = root + "/duels"
    body = {"blueprint_id": "derivabilite-fr-v1"}
    headers = {**auth, "Idempotency-Key": "new-duel"}
    assert client.post(path, headers=headers, json=body).status_code == 403
    main(["set-plan", "eleve01", "pro"])
    assert client.post(path, headers=headers, json={**body, "opponent_pseudo": "guest01"}).status_code == 409
    duel = client.post(path, headers=headers, json=body).json()
    assert client.get(path + "/blueprints", headers=guest).status_code == 403
    assert client.get("/learning/group-review", headers=guest).status_code == 403
    join = {**guest, "Idempotency-Key": "join"}
    assert client.post(path + "/join", headers=join, json={"code": duel["invite_code"]}).status_code == 403
    main(["set-plan", "guest01", "pro"])
    assert client.post(path + "/join", headers=join, json={"code": duel["invite_code"]}).status_code == 200
    main(["set-plan", "guest01", "free"])
    assert client.get(path + "/" + duel["duel_id"], headers=guest).status_code == 403


def test_recorded_mistake_shortcut_requires_pro_and_checks_own_progress(client, auth, agent):
    from src.manage import main

    path = "/learning/mistake-practice"
    request = {"topic": "derivabilite", "type": "calculation"}
    assert client.post(path, headers=auth, json=request).json()["detail"] == {
        "error": "pro_required", "feature": "mistake_practice",
    }
    assert not agent.calls
    main(["set-plan", "eleve01", "pro"])
    assert client.post(path, headers=auth, json=request).status_code == 404
    progress_path = agent.calls[-1][1]
    agent.responses[progress_path] = httpx.Response(200, json={
        "style": "examples", "level_estimate": "unknown", "diagnosed": False, "topics": [],
        "mistakes": [{**request, "label": "Dérivabilité", "count": 2, "ts": 0}],
    })
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    response = client.post(path, headers=auth, json=request)
    assert response.status_code == 201
    body = response.json()
    assert "Dérivabilité" in body["message"] and "calculation" in body["message"]
    assert any(row["id"] == body["session_id"] and row["subject"] == "math"
               for row in client.get("/tutor/sessions", headers=auth).json())
    other = register(client, "other01")
    main(["set-plan", "other01", "pro"])
    assert client.post(path, headers=other, json=request).status_code == 404


def test_migration_sets_existing_profiles_to_free(client, auth, db):
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import text

    from src.manage import main
    from tests.conftest import ALEMBIC_INI

    assert main(["set-plan", "eleve01", "pro"]) == 0
    cfg = Config(str(ALEMBIC_INI))
    try:
        command.downgrade(cfg, "f7a3d2c8e914")
        assert db.scalar(text("SELECT count(*) FROM learner_profiles")) == 1
        db.rollback()
    finally:
        db.rollback()
        command.upgrade(cfg, "head")
    assert client.get("/me/profile", headers=auth).json()["student_plan"] == "free"


def test_operator_rejects_invalid_plan(client, auth):
    import pytest

    from src.manage import main

    with pytest.raises(SystemExit) as error:
        main(["set-plan", "eleve01", "premium"])
    assert error.value.code == 2
    assert client.get("/me/profile", headers=auth).json()["student_plan"] == "free"


def test_pilot_requests_survive_refresh_and_operator_resolution(client, auth, capsys):
    from src.manage import main

    for _ in range(2):
        response = client.post("/me/pro-request", headers=auth)
        assert response.status_code == 200
        assert response.json()["student_plan"] == "free"
    assert client.get("/me/profile", headers=auth).json()["pro_requested"]
    assert main(["pro-requests"]) == 0
    assert capsys.readouterr().out.splitlines() == ["eleve01"]
    assert main(["set-plan", "eleve01", "pro"]) == 0
    capsys.readouterr()
    assert not client.post("/me/pro-request", headers=auth).json()["pro_requested"]
    assert main(["pro-requests"]) == 0
    assert not capsys.readouterr().out


def test_pro_request_can_be_cancelled_once(client, auth, capsys):
    from src.manage import main

    assert client.delete("/me/pro-request", headers=auth).status_code == 404
    client.post("/me/pro-request", headers=auth)
    assert client.delete("/me/pro-request", headers=auth).status_code == 204
    assert not client.get("/me/profile", headers=auth).json()["pro_requested"]
    assert main(["pro-requests"]) == 0
    assert not capsys.readouterr().out
    assert client.delete("/me/pro-request", headers=auth).status_code == 404


def test_unclassified_mistake_cannot_start_math_practice(client, auth, agent):
    from src.manage import main

    main(["set-plan", "eleve01", "pro"])
    response = client.post("/learning/mistake-practice", headers=auth, json={"topic": "autre", "type": "concept"})
    assert response.status_code == 404
    assert not agent.calls
