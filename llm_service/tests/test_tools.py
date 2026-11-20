import json
from dataclasses import replace
from pathlib import Path

import httpx
import pytest

from app.agent.limits import Limits
from app.agent.tools import FakeRag, HttpRag, RagUnavailable, SearchRequest
from app.capacity.governor import Level

FIXTURE = Path(__file__).parent / "fixtures" / "chunks.json"
REQ = SearchRequest("fonction dérivable limite taux", "4eme", "sc_exp", "math", "fr", 4)


async def test_fake_rag_filters_by_content_type_and_ranks():
    rag = FakeRag(FIXTURE)
    courses = await rag.search("search_courses", REQ)
    assert courses[0].chunk_id == "math_4sc_derivee_001"
    assert all(c.content_type == "course" for c in courses)
    exercises = await rag.search("search_exercises", REQ)
    assert [c.chunk_id for c in exercises] == ["math_4sc_exo_derivee_004"]


async def test_http_rag_sends_content_type():
    def handler(request):
        assert b'"content_type": "definition"' in request.content or b'"content_type":"definition"' in request.content
        return httpx.Response(
            200,
            json={
                "chunks": [
                    {"chunk_id": "d1", "content": "x", "score": 0.9, "source": "s", "page": 1, "extra": "ignored"}
                ]
            },
        )

    rag = HttpRag("http://rag.test", httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    chunks = await rag.search("search_definitions", REQ)
    assert chunks[0].chunk_id == "d1"


@pytest.mark.parametrize("subject,expected", [("math", "mathematics"), ("physics", "physics")])
async def test_http_rag_sends_subject_alias(subject, expected):
    def handler(request):
        assert json.loads(request.content)["subject"] == expected
        return httpx.Response(200, json={"chunks": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await HttpRag("http://rag.test", client).search("search_courses", replace(REQ, subject=subject))


async def test_http_rag_retries_without_section_when_the_section_has_no_passages():
    sections = []

    def handler(request):
        section = json.loads(request.content)["section"]
        sections.append(section)
        chunks = [] if section else [{"chunk_id": "c1", "content": "x", "score": 0.8, "source": "s", "page": 2}]
        return httpx.Response(200, json={"chunks": chunks})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        chunks = await HttpRag("http://rag.test", client).search("search_courses", REQ)
    assert sections == ["sc_exp", None] and [c.chunk_id for c in chunks] == ["c1"]


async def test_http_rag_keeps_section_results_without_a_second_search():
    calls = []

    def handler(request):
        calls.append(json.loads(request.content)["section"])
        chunk = {"chunk_id": "c1", "content": "x", "score": 0.8, "source": "s", "page": 2}
        return httpx.Response(200, json={"chunks": [chunk]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await HttpRag("http://rag.test", client).search("search_courses", REQ)
    assert calls == ["sc_exp"]


async def test_http_rag_reads_nested_metadata():
    chunk = {
        "rank": 1,
        "chunk_id": "math_4eme_se_001_chunk_002",
        "document_id": "math_4eme_se_001",
        "content": "Une définition du cours.",
        "score": 0.83,
        "scores": {"coverage": 0.9, "dense": 0.7, "bm25": 7.1, "rrf": 0.032},
        "metadata": {
            "country": "Tunisia",
            "grade": "4eme_annee_secondaire",
            "section": "sciences_experimentales",
            "subject": "Mathematics",
            "topic": "Continuity",
            "heading": "Definition",
            "content_type": "definition",
            "language": "fr",
            "source": "Manuel de mathématiques",
            "page": 2,
        },
    }
    body = {
        "chunks": [chunk, {**chunk, "chunk_id": "override", "source": "Top-level source", "page": 4}],
        "evidence_hint": "sufficient",
        "diagnostics": {"normalized_question": "définition", "chunks_after_filters": 20},
        "cached": False,
        "latency_ms": 12.3,
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    async with httpx.AsyncClient(transport=transport) as client:
        first, second = await HttpRag("http://rag.test", client).search("search_definitions", REQ)
    assert (first.source, first.page, first.topic) == ("Manuel de mathématiques", 2, "Continuity")
    assert (first.content_type, first.language) == ("definition", "fr")
    assert (second.source, second.page) == ("Top-level source", 4)


def test_limits_tighten_in_eco():
    assert Limits.for_level(Level.FULL).max_rounds == 2
    eco = Limits.for_level(Level.ECO)
    assert (eco.max_rounds, eco.max_chunks) == (1, 4)


@pytest.mark.parametrize("body", [[], {"chunks": {}}])
async def test_http_rag_rejects_malformed_envelope(body):
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(RagUnavailable):
            await HttpRag("http://rag.test", client).search("search_courses", REQ)


async def test_http_rag_skips_invalid_chunks():
    valid = {"chunk_id": "valid", "content": "text", "score": 0.8, "source": "src", "page": None}
    body = {"chunks": [{}, {**valid, "score": "0.8"}, valid]}
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    async with httpx.AsyncClient(transport=transport) as client:
        chunks = await HttpRag("http://rag.test", client).search("search_courses", REQ)
    assert [chunk.chunk_id for chunk in chunks] == ["valid"]


async def test_http_rag_failure_raises_rag_unavailable():
    rag = HttpRag("http://rag.test", httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500))))
    with pytest.raises(RagUnavailable):
        await rag.search("search_courses", REQ)
