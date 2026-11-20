import asyncio
import json
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.agent.tools import FakeRag, SearchRequest
from app.api.main import build
from app.cache.store import CacheStore, quiz_key
from app.capacity.governor import Level
from app.pedagogy.quiz import NotInCourse, QuizUnavailable, build_quiz
from app.providers.platform import Tier
from app.routing.router import ModelRouter, RouteContext
from app.trace import NO_CACHE_EVENTS, Trace
from tests.fakes import FakeClient
from tests.test_api import fake_platform

CHUNKS = Path(__file__).parent / "fixtures" / "chunks.json"
TOPIC = "logarithme"
CHUNK = "math_4sc_derivee_001"
SEARCH = SearchRequest("Fonction logarithme népérien", "4eme_annee_secondaire", "mathematiques", "math", "fr", 4)


def item(n: int, **over) -> dict:
    base = {
        "question": f"Question numéro {n} sur la dérivabilité ?",
        "choices": [f"réponse {n}a", f"réponse {n}b", f"réponse {n}c", f"réponse {n}d"],
        "answer_index": n % 4,
        "explanation": f"Parce que le cours le dit ({n}).",
        "chunk_id": CHUNK,
    }
    return {**base, **over}


def quiz(*items) -> dict:
    return {"questions": list(items)}


def five() -> dict:
    return quiz(*[item(n) for n in range(5)])


def run(client, cache=None, trace=None, tier=Tier.MID, fair=None, search=SEARCH):
    return asyncio.run(
        build_quiz(
            TOPIC,
            search,
            rag=FakeRag(CHUNKS),
            client=client,
            cache=cache or CacheStore(":memory:"),
            tier=tier,
            trace=trace or Trace(),
            reply_language="fr",
            fair=fair,
            learner_id="p1",
        )
    )


class GatedClient(FakeClient):
    """Holds each model call until the test opens the gate, like a slow CPU-only model."""

    def __init__(self, *texts):
        super().__init__(*texts)
        self.gate = asyncio.Event()

    async def call(self, *args, **kwargs):
        await self.gate.wait()
        return await super().call(*args, **kwargs)


def test_a_generation_that_outlives_the_request_deadline_is_kept_for_the_retry():
    async def scenario():
        client, cache = GatedClient(five()), CacheStore(":memory:")
        args = dict(rag=FakeRag(CHUNKS), client=client, cache=cache, tier=Tier.MID, learner_id="p1")
        with pytest.raises(TimeoutError):
            async with asyncio.timeout(0.01):
                await build_quiz(TOPIC, SEARCH, trace=Trace(), **args)
        retry = asyncio.create_task(build_quiz(TOPIC, SEARCH, trace=Trace(), **args))
        await asyncio.sleep(0)
        client.gate.set()
        first = await retry
        again = await build_quiz(TOPIC, SEARCH, trace=Trace(), **args)
        return client, first, again

    client, first, again = asyncio.run(scenario())
    assert len(client.calls) == 1
    assert first == again and len(first) == 4


def test_valid_questions_carry_ids_and_their_source():
    questions = run(FakeClient(five()))
    assert [q["id"] for q in questions] == ["q1", "q2", "q3", "q4"]
    assert questions[0]["source"] == {"chunk_id": CHUNK, "source": "Manuel Math 4e Sc, ch. 3", "page": 41}
    assert set(questions[0]) == {"id", "question", "choices", "answer_index", "explanation", "source"}


def test_invalid_items_are_dropped():
    bad = [
        item(1, choices=["a", "b", "c"]),
        item(2, choices=["a", "a", "b", "c"]),
        item(3, answer_index=4),
        item(4, answer_index="1"),
        item(5, chunk_id="invented_chunk"),
        item(6, question=""),
        item(7, choices=["a", "b", "", "c"]),
        item(8, question="La réponse est réponse 8a, non ?", answer_index=0),
        item(9, question="Quelle de ces affirmations est vraie selon l'extrait?"),
        item(13, question="Laquelle de ces propositions est correcte ?"),
        item(14, question="D'après le texte, que vaut f'(0) ?"),
        item(15, question="Quelle propriété est vraie pour toutes les fonctions dérivables ?"),
    ]
    questions = run(FakeClient(quiz(item(10), item(11), item(12), *bad)))
    assert [q["question"] for q in questions] == [item(n)["question"] for n in (10, 11, 12)]


def test_fewer_than_three_valid_questions_is_unavailable():
    with pytest.raises(QuizUnavailable) as e:
        run(FakeClient(quiz(item(1), item(2), item(3, answer_index=9))))
    assert e.value.retry_after == 30


def test_unparseable_model_output_is_unavailable():
    with pytest.raises(QuizUnavailable):
        run(FakeClient("not json"))


def test_no_course_passages_is_not_in_course():
    client = FakeClient()
    with pytest.raises(NotInCourse):
        run(client, search=replace(SEARCH, query="Suites réelles"))
    assert client.calls == []


def test_second_request_is_a_cache_hit_without_a_model_call():
    cache, client = CacheStore(":memory:"), FakeClient(five())
    first = run(client, cache)
    trace = Trace()
    second = run(client, cache, trace)
    assert second == first and len(client.calls) == 1
    assert trace.cache == "artifact" and trace.receipt()["llm_calls"] == 0


def test_degraded_result_is_not_cached():
    cache = CacheStore(":memory:")
    client = FakeClient(five(), five(), fallback_on_mid=True)
    trace = Trace()
    run(client, cache, trace)
    assert "fallback_compact" in trace.events and NO_CACHE_EVENTS & set(trace.events)
    run(client, cache)
    assert len(client.calls) == 2


def test_quiz_uses_the_given_tier_and_only_the_retrieved_excerpts():
    client = FakeClient(five())
    run(client)
    tier, messages = client.calls[0]
    assert tier is Tier.MID
    assert "français" in messages[0]["content"] and CHUNK in messages[1]["content"]


def test_quiz_step_is_routed_to_the_larger_model():
    assert ModelRouter().choose("quiz", RouteContext(Level.FULL))[0] is Tier.MID


def test_quiz_key_depends_on_chunks_and_language_not_their_order():
    a = quiz_key(TOPIC, "fr", chunk_ids=["x", "y"])
    assert a == quiz_key(TOPIC, "fr", chunk_ids=["y", "x"])
    assert a != quiz_key(TOPIC, "en", chunk_ids=["x", "y"])
    assert a != quiz_key(TOPIC, "fr", chunk_ids=["x"])
    assert a.startswith("q:")


BODY = {"learner_id": "p1", "topic": TOPIC}


def test_quiz_route_returns_questions_with_receipt(settings):
    reply = json.dumps(five())
    with TestClient(build(settings, fake_platform(settings, reply))) as http:
        r = http.post("/quiz", json=BODY)
        assert r.status_code == 200
        body = r.json()
        assert body["topic"] == TOPIC and len(body["questions"]) == 4
        assert body["receipt"]["mid_calls"] == 1
        again = http.post("/quiz", json=BODY).json()
        assert again["receipt"]["cache"] == "artifact" and again["receipt"]["llm_calls"] == 0
        assert http.get("/metrics").json()["kind_quiz"] == 2


def test_quiz_route_unknown_topic_is_404(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        r = http.post("/quiz", json={**BODY, "topic": "not_a_topic"})
        assert r.status_code == 404


def test_quiz_route_topic_missing_from_corpus_is_404(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        r = http.post("/quiz", json={**BODY, "topic": "suites"})
        assert r.status_code == 404 and r.json()["detail"] == {"error": "not_in_course"}


def test_quiz_route_with_too_few_valid_questions_is_503(settings):
    reply = json.dumps(quiz(item(1), item(2)))
    with TestClient(build(settings, fake_platform(settings, reply))) as http:
        r = http.post("/quiz", json=BODY)
        assert r.status_code == 503 and r.json()["detail"] == {"retry_after": 30}


def test_quiz_route_shares_the_learners_model_allowance(settings):
    settings = replace(settings, learner_burst=1, learner_requests_per_min=0.01)
    reply = json.dumps(five())
    with TestClient(build(settings, fake_platform(settings, reply, reply))) as http:
        assert http.post("/quiz", json={**BODY, "topic": "exponentielle"}).status_code == 200
        r = http.post("/quiz", json=BODY)
        assert r.status_code == 503 and r.json()["detail"]["retry_after"] > 0


def test_quiz_request_rejects_personal_curriculum_fields(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        assert http.post("/quiz", json={**BODY, "grade": "Jean Dupont"}).status_code == 422
