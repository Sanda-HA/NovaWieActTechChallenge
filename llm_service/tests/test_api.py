import asyncio
import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent.orchestrator import ChatRequest, Orchestrator
from app.api.main import build
from app.providers.platform import PlatformProvider

TRIAGE = (
    '{"action": "SEARCH_COURSE", "topic": "derivabilite", "difficulty": 1, '
    '"queries": ["fonction dérivable limite taux variation"]}'
)
ANSWER = "Définition [[math_4sc_derivee_001]]."


def test_generated_answers_are_not_persisted_on_disk(settings):
    app = build(settings, fake_platform(settings, TRIAGE, ANSWER))
    with TestClient(app) as http:
        request = {"session_id": "s", "message": "fonction dérivable limite taux variation"}
        assert http.post("/chat", json=request).json()["badge"] == "course"
        repeated = http.post("/chat", json={**request, "session_id": "t"}).json()
        assert repeated["receipt"]["llm_calls"] == 0
    assert not Path(settings.cache_path).exists()


def fake_platform(settings, *replies):
    queue = iter(replies)

    def handler(request):
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": next(queue)}}]},
            headers={"X-Quota-Remaining": "8", "X-Quota-Limit": "10"},
        )

    return PlatformProvider(settings, httpx.AsyncClient(transport=httpx.MockTransport(handler)))


def test_chat_events_streams_stages_then_result_metrics_and_a_log_line(settings):
    app = build(settings, fake_platform(settings, TRIAGE, ANSWER))
    with TestClient(app) as http:
        body = http.post("/chat/events", json={"session_id": "s", "message": "dérivable ?"}).text
        assert body.index("understanding") < body.index("searching") < body.index("event: result")
        m = http.get("/metrics").json()
        assert m["requests"] == 1 and m["compact_calls"] == 2 and m["mid_share"] == 0.0
    line = json.loads(open(settings.request_log_path, encoding="utf-8").read().splitlines()[0])
    assert line["badge"] == "course" and "dérivable" not in json.dumps(line, ensure_ascii=False)


@pytest.mark.parametrize("internal_error", [False, True])
async def test_stream_terminates_after_upstream_failure(settings, monkeypatch, internal_error):
    async def fail(*args):
        raise RuntimeError("synthetic internal failure")

    if internal_error:
        monkeypatch.setattr(Orchestrator, "handle", fail)
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"choices": []}))
    async with httpx.AsyncClient(transport=transport) as platform:
        app = build(settings, PlatformProvider(settings, platform))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            response = await asyncio.wait_for(
                http.post("/chat/events", json={"session_id": "s", "message": "fonction dérivable limite taux"}),
                timeout=3,
            )
    assert response.status_code == 200
    if internal_error:
        assert response.text == 'event: error\ndata: {"error": "internal_error"}\n\n'
        line = json.loads(Path(settings.request_log_path).read_text(encoding="utf-8").splitlines()[-1])
        assert line["kind"] == "chat" and line["error"] == "internal_error"
    else:
        data = json.loads(response.text.split("event: result\ndata: ")[1])
        assert data["badge"] == "course_excerpt"


async def test_stream_close_cancels_producer(settings, monkeypatch):
    release = asyncio.Event()
    cancelled = asyncio.Event()
    workers = []

    async def block(self, req, stage):
        workers.append(asyncio.current_task())
        try:
            await stage("understanding")
            await release.wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    monkeypatch.setattr(Orchestrator, "handle", block)
    app = build(settings, fake_platform(settings))
    route = next(route for route in app.routes if getattr(route, "path", None) == "/chat/events")
    response = await route.endpoint(ChatRequest(session_id="s", message="q"))
    try:
        assert (await anext(response.body_iterator)).startswith("event: stage")
        await response.body_iterator.aclose()
        assert cancelled.is_set()
    finally:
        release.set()
        await asyncio.gather(*workers, return_exceptions=True)


def test_request_log_omits_invented_citation_text(settings):
    marker = "synthetic_student_text"
    with TestClient(build(settings, fake_platform(settings, TRIAGE, f"[[{marker}]]", ANSWER))) as http:
        response = http.post("/chat", json={"session_id": "s", "message": marker})
        assert response.status_code == 200
    line = Path(settings.request_log_path).read_text(encoding="utf-8")
    assert "invented_citations" in line
    assert marker not in line


def test_feedback_invalidates_cache(settings):
    with TestClient(build(settings, fake_platform(settings, TRIAGE, ANSWER))) as http:
        r = http.post("/chat", json={"session_id": "s", "message": "C'est quoi une fonction dérivable ?"}).json()
        out = http.post("/feedback", json={"response_id": r["response_id"], "helpful": False, "reason": "wrong"}).json()
        assert out["removed_from_cache"] == 2
        assert http.get("/metrics").json()["helpful_rate"] == 0.0


def test_group_check(settings):
    verdict = json.dumps(
        {"verdict": "incorrect", "issue": "x", "chunk_id": "math_4sc_continuite_001", "guiding_question": "Et |x-1| ?"}
    )
    with TestClient(build(settings, fake_platform(settings, verdict))) as http:
        r = http.post(
            "/group/check",
            json={"room_id": "r", "learner_id": "p1", "explanation": "Toute fonction continue est dérivable"},
        ).json()
        assert r["verdict"] == "incorrect" and r["source"]["page"] == 23


def test_curriculum_fields_reject_personal_data(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        chat = {"session_id": "s", "message": "je veux mourir"}
        group = {"room_id": "r", "learner_id": "p1", "explanation": "je veux mourir"}
        for field in ("grade", "section", "subject", "level"):
            assert http.post("/chat", json={**chat, field: "a@b.com"}).status_code == 422
        for field in ("grade", "section", "subject"):
            assert http.post("/group/check", json={**group, field: "a@b.com"}).status_code == 422


def test_group_distress_skips_retrieval_and_logging(settings, monkeypatch):
    async def unexpected_search(*args):
        raise AssertionError("distress must not reach retrieval")

    monkeypatch.setattr("app.agent.tools.FakeRag.search", unexpected_search)
    with TestClient(build(settings, fake_platform(settings))) as http:
        response = http.post(
            "/group/check",
            json={"room_id": "r", "learner_id": "p1", "explanation": "Je m'appelle Alice je veux mourir"},
        ).json()
        assert response["verdict"] == "wellbeing" and response["source"] is None
        assert http.get("/metrics").json().get("requests", 0) == 0
    assert not Path(settings.request_log_path).exists()


def test_diagnostic_then_progress(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        assert "level_check" in http.get("/diagnostic").json()
        r = http.post("/diagnostic/p1", json={"s1": "visual", "l1": "6x"}).json()
        assert r["style"] == "visual"
        p = http.get("/learner/p1/progress").json()
        assert p["diagnosed"] and p["style"] == "visual" and p["topics"] == []


def test_group_checks_share_the_learners_model_allowance(settings):
    from dataclasses import replace

    verdict = json.dumps(
        {"verdict": "correct", "chunk_id": "math_4sc_continuite_001", "guiding_question": "Pourquoi ?"}
    )
    settings = replace(settings, learner_burst=1, learner_requests_per_min=0.01)
    with TestClient(build(settings, fake_platform(settings, verdict, verdict))) as http:
        body = {"room_id": "r", "learner_id": "p1", "explanation": "Une fonction continue est dérivable"}
        assert http.post("/group/check", json=body).status_code == 200
        assert http.post("/group/check", json=body).status_code == 503
        assert http.get("/metrics").json()["llm_calls"] == 1
    failure = json.loads(Path(settings.request_log_path).read_text(encoding="utf-8").splitlines()[-1])
    assert failure["kind"] == "group" and failure["error"] == "http_503"


async def test_group_check_has_a_bounded_model_wait(settings):
    from dataclasses import replace

    async def blocked(request):
        await asyncio.sleep(10)

    settings = replace(settings, request_timeout_s=0.02)
    async with httpx.AsyncClient(transport=httpx.MockTransport(blocked)) as platform:
        app = build(settings, PlatformProvider(settings, platform))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://agent") as http:
            response = await asyncio.wait_for(
                http.post(
                    "/group/check",
                    json={
                        "room_id": "r",
                        "learner_id": "p1",
                        "explanation": "Toute fonction continue est dérivable",
                    },
                ),
                timeout=0.2,
            )
    assert response.status_code == 200
    assert response.json()["verdict"] == "unknown"
    assert response.json()["guiding_question"]
    assert "request_timeout" in response.json()["receipt"]["events"]


def test_purge_removes_learner_and_rejects_late_writes(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        assert http.post("/diagnostic/p1", json={"s1": "visual"}).status_code == 200
        assert http.request("DELETE", "/learner/p1", json={"session_ids": ["s"]}).status_code == 200
        assert http.get("/learner/p1/progress").status_code == 404
        assert http.post("/diagnostic/p1", json={"s1": "visual"}).status_code == 404


def test_progress_lists_mistakes_by_topic_and_type_newest_first(settings):
    from app.sessions import LearnerStore, Profile

    profile = Profile()
    for topic, kind, ts in [
        ("derivabilite", "calculation", 1.0),
        ("integrales", "concept", 2.0),
        ("derivabilite", "calculation", 3.0),
        ("derivabilite", "notation", 4.0),
    ]:
        profile.record_mistake(topic, None, kind, ts=ts)
    store = LearnerStore(settings.learner_db_path)
    store._live["p1"] = profile
    store.save("p1")
    with TestClient(build(settings, fake_platform(settings))) as http:
        mistakes = http.get("/learner/p1/progress").json()["mistakes"]
    assert [(m["topic"], m["type"], m["count"]) for m in mistakes] == [
        ("derivabilite", "notation", 1),
        ("derivabilite", "calculation", 2),
        ("integrales", "concept", 1),
    ]
    assert mistakes[0]["label"] == "Dérivabilité"
