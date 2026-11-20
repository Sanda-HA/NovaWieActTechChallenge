import asyncio
import json
from dataclasses import replace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.main import build
from app.capacity.governor import Level
from app.pedagogy.room import FALLBACK, write_goal, write_notes, write_prompt
from app.providers.platform import PlatformProvider, Tier
from app.routing.router import ModelRouter, RouteContext
from app.trace import Trace
from tests.fakes import FakeClient
from tests.test_api import fake_platform

LEARNER = "owner-pseudonym-0123456789abcdef"


def goal(text, client=None, lang="fr"):
    client = client or FakeClient(text)
    return asyncio.run(
        write_goal("La dérivabilité", lang, client=client, tier=Tier.COMPACT, trace=Trace(), learner_id=LEARNER)
    )


def prompt(text, recent=("Une fonction continue est dérivable",), lang="fr", client=None):
    client = client or FakeClient(text)
    return asyncio.run(
        write_prompt(
            "Comprendre la dérivabilité", list(recent), lang,
            client=client, tier=Tier.COMPACT, trace=Trace(), learner_id=LEARNER,
        )
    )


def notes(text, posts=(), lang="fr", client=None):
    client = client or FakeClient(text)
    return asyncio.run(
        write_notes(
            "Comprendre la dérivabilité", list(posts), lang,
            client=client, tier=Tier.COMPACT, trace=Trace(), learner_id=LEARNER,
        )
    )


def test_goal_is_one_sentence_from_the_model():
    client = FakeClient({"goal": "Comprendre quand une fonction est dérivable."})
    assert goal(None, client) == "Comprendre quand une fonction est dérivable."
    tier, messages = client.calls[0]
    assert tier is Tier.COMPACT
    assert "La dérivabilité" in messages[1]["content"]
    assert LEARNER not in json.dumps(messages)


@pytest.mark.parametrize("lang", ["fr", "en", "ar"])
@pytest.mark.parametrize(
    "bad",
    ["not json", {"goal": ""}, {"goal": "   "}, {"goal": "x" * 201}, {"goal": 3}, {"other": "x"}, '["x"]', "null"],
)
def test_invalid_goal_falls_back_to_fixed_text(bad, lang):
    assert goal(bad, lang=lang) == FALLBACK["goal"][lang].format(topic="La dérivabilité")


def test_goal_of_exactly_200_characters_is_accepted():
    assert goal({"goal": "x" * 200}) == "x" * 200


def test_prompt_is_a_question_and_sees_the_recent_posts_but_no_learner_id():
    client = FakeClient({"question": "Qui peut donner un exemple de fonction non dérivable ?"})
    assert prompt(None, client=client) == "Qui peut donner un exemple de fonction non dérivable ?"
    user = client.calls[0][1][1]["content"]
    assert "Comprendre la dérivabilité" in user and "Une fonction continue est dérivable" in user
    assert LEARNER not in json.dumps(client.calls[0][1])


@pytest.mark.parametrize("lang", ["fr", "en", "ar"])
@pytest.mark.parametrize("bad", ["oops", {"question": ""}, {"question": "y" * 201}, {"question": None}, "[1]"])
def test_invalid_prompt_falls_back_to_fixed_text(bad, lang):
    assert prompt(bad, lang=lang) == FALLBACK["prompt"][lang]


def test_notes_are_capped_and_cleaned():
    raw = {"notes": ["a", "", "  ", 5, "z" * 201, "b", "c", "d", "e", "f", "g"]}
    assert notes(raw) == ["a", "b", "c", "d", "e", "f"]


def test_template_placeholders_copied_by_the_model_are_dropped():
    raw = {"notes": ["À revoir : |x| en 0.", "...", "À revoir : ...", "…", "- "]}
    assert notes(raw) == ["À revoir : |x| en 0."]


@pytest.mark.parametrize("lang", ["fr", "en", "ar"])
@pytest.mark.parametrize("bad", ["oops", {"notes": "texte"}, {"notes": []}, {"notes": ["", 1]}, {"x": 1}, "[]"])
def test_invalid_notes_fall_back_to_fixed_text(bad, lang):
    assert notes(bad, lang=lang) == [FALLBACK["notes"][lang]]


def test_notes_prompt_carries_kind_and_verdict_but_no_learner_id():
    client = FakeClient({"notes": ["Point clé"]})
    posts = [
        {"kind": "explanation", "text": "Dérivable implique continue.", "verdict": "correct"},
        {"kind": "question", "text": "Pourquoi |x| n'est pas dérivable ?", "verdict": None},
    ]
    assert notes(None, posts, client=client) == ["Point clé"]
    user = client.calls[0][1][1]["content"]
    assert "explanation" in user and "correct" in user and "Pourquoi |x|" in user
    assert LEARNER not in json.dumps(client.calls[0][1])


def test_room_steps_are_routed_to_the_compact_model():
    router = ModelRouter()
    for step in ("room_goal", "room_prompt", "room_notes"):
        assert router.choose(step, RouteContext(Level.FULL)) == (Tier.COMPACT, "compact_step")


def capturing_platform(settings, *replies):
    queue, seen = iter(replies), []

    def handler(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": next(queue)}}]})

    return PlatformProvider(settings, httpx.AsyncClient(transport=httpx.MockTransport(handler))), seen


def test_goal_route_resolves_the_topic_label_and_records_a_compact_receipt(settings):
    reply = json.dumps({"goal": "Savoir reconnaître une fonction dérivable."})
    platform, seen = capturing_platform(settings, reply)
    with TestClient(build(settings, platform)) as http:
        r = http.post("/room/goal", json={"learner_id": LEARNER, "topic": "derivabilite", "reply_language": "fr"})
        assert r.status_code == 200
        body = r.json()
        assert body["goal"] == "Savoir reconnaître une fonction dérivable."
        assert body["receipt"]["compact_calls"] == 1 and body["receipt"]["mid_calls"] == 0
        assert {"trace", "capacity_level"} <= set(body)
        assert http.get("/metrics").json()["compact_calls"] == 1
    assert "Dérivabilité" in json.dumps(seen[0], ensure_ascii=False)
    assert LEARNER not in json.dumps(seen[0])


def test_goal_route_rejects_unknown_topics_and_bad_fields(settings):
    with TestClient(build(settings, fake_platform(settings))) as http:
        ok = {"learner_id": LEARNER, "topic": "derivabilite", "reply_language": "fr"}
        r = http.post("/room/goal", json={**ok, "topic": "nope"})
        assert r.status_code == 404 and r.json()["detail"] == {"error": "unknown_topic"}
        assert http.post("/room/goal", json={**ok, "topic": "A b"}).status_code == 422
        assert http.post("/room/goal", json={**ok, "reply_language": "darija"}).status_code == 422
        assert http.post("/room/goal", json={**ok, "learner_id": "x" * 65}).status_code == 422


def test_prompt_route_redacts_recent_posts_and_validates_sizes(settings):
    platform, seen = capturing_platform(settings, json.dumps({"question": "Et si f n'est pas continue ?"}))
    with TestClient(build(settings, platform)) as http:
        body = {
            "learner_id": LEARNER,
            "goal": "Comprendre la dérivabilité",
            "reply_language": "en",
            "recent": ["Écrivez-moi à alice@example.com", "Je m'appelle Karim Ben"],
        }
        r = http.post("/room/prompt", json=body)
        assert r.status_code == 200 and r.json()["question"] == "Et si f n'est pas continue ?"
        assert r.json()["receipt"]["compact_calls"] == 1
        sent = json.dumps(seen[0], ensure_ascii=False)
        assert "alice@example.com" not in sent and "Karim" not in sent
        assert http.post("/room/prompt", json={**body, "recent": ["x"] * 6}).status_code == 422
        assert http.post("/room/prompt", json={**body, "recent": ["x" * 1001]}).status_code == 422
        assert http.post("/room/prompt", json={**body, "goal": "x" * 301}).status_code == 422


def test_notes_route_redacts_texts_and_validates_posts(settings):
    platform, seen = capturing_platform(settings, json.dumps({"notes": ["Dérivable implique continue"]}))
    with TestClient(build(settings, platform)) as http:
        posts = [
            {"kind": "explanation", "text": "Appelez-moi au 22 333 444", "verdict": "incomplete"},
            {"kind": "question", "text": "Pourquoi ?"},
        ]
        body = {"learner_id": LEARNER, "goal": "Comprendre", "reply_language": "ar", "posts": posts}
        r = http.post("/room/notes", json=body)
        assert r.status_code == 200 and r.json()["notes"] == ["Dérivable implique continue"]
        assert "22 333 444" not in json.dumps(seen[0], ensure_ascii=False)
        assert http.post("/room/notes", json={**body, "posts": posts * 16}).status_code == 422
        assert http.post("/room/notes", json={**body, "posts": [{"kind": "chat", "text": "x"}]}).status_code == 422
        long = {"kind": "question", "text": "x" * 1001}
        assert http.post("/room/notes", json={**body, "posts": [long]}).status_code == 422


def test_invalid_model_output_still_answers_200_with_the_fallback(settings):
    with TestClient(build(settings, fake_platform(settings, "not json"))) as http:
        r = http.post("/room/goal", json={"learner_id": LEARNER, "topic": "derivabilite", "reply_language": "ar"})
        assert r.status_code == 200
        assert r.json()["goal"] == FALLBACK["goal"]["ar"].format(topic="Dérivabilité")


def test_room_calls_share_the_learners_model_allowance(settings):
    settings = replace(settings, learner_burst=1, learner_requests_per_min=0.01)
    reply = json.dumps({"question": "Qui veut tenter ?"})
    with TestClient(build(settings, fake_platform(settings, reply, reply))) as http:
        body = {"learner_id": LEARNER, "goal": "Comprendre", "recent": [], "reply_language": "fr"}
        assert http.post("/room/prompt", json=body).status_code == 200
        busy = http.post("/room/prompt", json=body)
        assert busy.status_code == 503 and busy.json()["detail"]["retry_after"] > 0
        assert http.get("/metrics").json()["llm_calls"] == 1


async def test_room_call_has_a_bounded_model_wait(settings):
    async def blocked(request):
        await asyncio.sleep(10)

    settings = replace(settings, request_timeout_s=0.02)
    async with httpx.AsyncClient(transport=httpx.MockTransport(blocked)) as platform:
        app = build(settings, PlatformProvider(settings, platform))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://agent") as http:
            body = {"learner_id": LEARNER, "goal": "Comprendre", "recent": [], "reply_language": "fr"}
            r = await asyncio.wait_for(http.post("/room/prompt", json=body), timeout=0.5)
    assert r.status_code == 503 and r.json()["detail"]["retry_after"] > 0
