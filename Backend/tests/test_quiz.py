import httpx
import pytest

from src.learning import quizzes
from src.manage import main
from tests.conftest import register


@pytest.fixture(autouse=True)
def clear_quizzes(auth, db):
    assert main(["set-plan", "eleve01", "pro"]) == 0
    quizzes.clear(db)
    yield
    quizzes.clear(db)


def start(client, auth, topic="derivabilite"):
    return client.get(f"/learning/quiz/{topic}", headers=auth)


def test_get_quiz_hides_answers_and_forwards_the_profile(client, auth, agent, db):
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    r = start(client, auth)
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"quiz_id", "topic", "questions"}
    assert [q["id"] for q in body["questions"]] == ["q1", "q2", "q3"]
    assert all(set(q) == {"id", "question", "choices"} for q in body["questions"])
    sent = agent.last("/quiz")
    assert sent["topic"] == "derivabilite" and sent["reply_language"] == "en"
    assert sent["grade"] == "4eme_annee_secondaire" and len(sent["learner_id"]) == 32
    assert "answer_index" not in r.text and "explanation" not in r.text


def test_answers_are_graded_without_a_model_call(client, auth, agent):
    quiz_id = start(client, auth).json()["quiz_id"]
    calls = len(agent.calls)
    r = client.post(f"/learning/quiz/{quiz_id}/answers", headers=auth, json={"answers": {"q1": 1, "q2": 0, "q3": 0}})
    assert r.status_code == 200
    body = r.json()
    assert body["score"] == 1 and body["total"] == 3
    assert [x["correct"] for x in body["results"]] == [True, False, False]
    assert body["results"][0]["answer_index"] == 1 and body["results"][0]["explanation"] == "Explication 1."
    assert body["results"][0]["source"]["page"] == 41
    assert len(agent.calls) == calls


def test_unanswered_questions_count_as_wrong(client, auth):
    quiz_id = start(client, auth).json()["quiz_id"]
    body = client.post(f"/learning/quiz/{quiz_id}/answers", headers=auth, json={"answers": {"q1": 1}}).json()
    assert body["score"] == 1 and body["total"] == 3


def test_answer_index_out_of_range_is_422(client, auth):
    quiz_id = start(client, auth).json()["quiz_id"]
    r = client.post(f"/learning/quiz/{quiz_id}/answers", headers=auth, json={"answers": {"q1": 4}})
    assert r.status_code == 422


def test_another_users_quiz_is_not_found(client, auth):
    quiz_id = start(client, auth).json()["quiz_id"]
    other = register(client, "autre")
    r = client.post(f"/learning/quiz/{quiz_id}/answers", headers=other, json={"answers": {}})
    assert r.status_code == 404 and r.json()["detail"] == {"error": "quiz_not_found"}


def test_unknown_quiz_id_is_not_found(client, auth):
    r = client.post("/learning/quiz/00000000-0000-0000-0000-000000000000/answers", headers=auth, json={"answers": {}})
    assert r.status_code == 404 and r.json()["detail"] == {"error": "quiz_not_found"}


def test_expired_quiz_is_not_found(client, auth, monkeypatch):
    quiz_id = start(client, auth).json()["quiz_id"]
    real = quizzes.time.time
    monkeypatch.setattr(quizzes.time, "time", lambda: real() + quizzes.TTL_S + 1)
    r = client.post(f"/learning/quiz/{quiz_id}/answers", headers=auth, json={"answers": {}})
    assert r.status_code == 404


def test_quiz_requires_login_and_a_valid_slug(client, auth):
    assert client.get("/learning/quiz/derivabilite").status_code == 401
    assert start(client, auth, "Not-A-Slug").status_code == 422


def test_agent_busy_maps_to_503_with_retry_after(client, auth, agent):
    agent.responses["/quiz"] = httpx.Response(503, json={"detail": {"retry_after": 30}})
    r = start(client, auth)
    assert r.status_code == 503
    assert r.json()["detail"] == {"error": "agent_busy", "retry_after": 30}
    assert r.headers["retry-after"] == "30"


def test_topic_missing_from_the_corpus_is_404(client, auth, agent):
    agent.responses["/quiz"] = httpx.Response(404, json={"detail": {"error": "not_in_course"}})
    r = start(client, auth)
    assert r.status_code == 404 and r.json()["detail"] == {"error": "not_in_course"}


def test_malformed_agent_quiz_is_a_502(client, auth, agent):
    agent.responses["/quiz"] = httpx.Response(200, json={"topic": "derivabilite", "questions": [{"id": "q1"}]})
    r = start(client, auth)
    assert r.status_code == 502 and r.json()["detail"] == {"error": "agent_error"}
