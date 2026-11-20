import httpx

from src.manage import main

PACK = "/learning/revision-pack/derivabilite"
PRACTICE = "/learning/bac-practice/derivabilite"


def test_packs_and_timed_practice_require_pro(client, auth, agent):
    assert client.post(PACK).status_code == 401
    assert client.get(PRACTICE).status_code == 401
    assert client.post(PACK, headers=auth).json()["detail"]["feature"] == "revision_pack"
    assert client.get(PRACTICE, headers=auth).json()["detail"]["feature"] == "bac_practice"
    assert not agent.calls


def test_demo_completion_is_available_to_free_accounts(client, auth, agent):
    path = "/learning/revision-demo/completion"
    assert client.post(path).status_code == 401
    assert client.post(path, headers=auth).status_code == 204
    assert not agent.calls


def test_revision_pack_handles_coverage_and_forwards_profile(client, auth, agent):
    assert main(["set-plan", "eleve01", "pro"]) == 0
    assert client.post(PACK, headers=auth).json()["detail"]["error"] == "not_in_course"
    assert not agent.calls
    client.put("/me/profile", headers=auth, json={"section": "sciences_experimentales", "reply_language": "en"})
    source = {"chunk_id": "math_4eme_se_002_chunk_001", "source": "Dérivabilité", "page": 1}
    agent.responses["/revision-pack"] = httpx.Response(200, json={
        "topic": "derivabilite", "sheet": [{"text": "The tangent slope is the derivative.", "source": source}],
        "cards": [{"question": f"Question {i}?", "answer": "Answer.", "source": source} for i in range(3)],
    })
    response = client.post(PACK, headers=auth)
    assert response.status_code == 200
    assert len(response.json()["cards"]) == 3
    assert agent.last("/revision-pack")["reply_language"] == "en"
    assert agent.last("/revision-pack")["section"] == "sciences_experimentales"
    agent.responses["/revision-pack"] = httpx.Response(200, json={"topic": "derivabilite", "cards": []})
    assert client.post(PACK, headers=auth).status_code == 502
    agent.responses["/revision-pack"] = httpx.Response(404, json={"detail": {"error": "not_in_course"}})
    assert client.post(PACK, headers=auth).status_code == 404
    agent.responses["/revision-pack"] = httpx.Response(503, json={"detail": {"retry_after": 2}})
    assert client.post(PACK, headers=auth).headers["retry-after"] == "2"


def test_timed_practice_issues_five_questions_and_grades_partial_after_downgrade(client, auth, agent):
    assert main(["set-plan", "eleve01", "pro"]) == 0
    response = client.get(PRACTICE, headers=auth)
    assert response.status_code == 200
    quiz = response.json()
    assert quiz["duration_seconds"] == 600
    assert len(quiz["questions"]) == 5
    assert "answer_index" not in response.text
    assert main(["set-plan", "eleve01", "free"]) == 0
    score = client.post(f"/learning/quiz/{quiz['quiz_id']}/answers", headers=auth, json={"answers": {}})
    assert score.json()["total"] == 5 and score.json()["score"] == 0
    assert not agent.calls
