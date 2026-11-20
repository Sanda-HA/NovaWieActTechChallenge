import asyncio
import json
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.agent.tools import Chunk, HttpRag, SearchRequest
from app.cache.store import CacheStore
from app.pedagogy.quiz import NotInCourse
from app.pedagogy.revision_pack import RevisionUnavailable, build_revision_pack
from app.providers.platform import Tier
from app.trace import Trace

CHUNK = Chunk("math_4eme_se_002_chunk_001", "La pente est f'(a).", 1, "Dérivabilité", 1)
SEARCH = SearchRequest("Dérivabilité et tangente", "4eme_annee_secondaire", "sciences_experimentales", "math", "fr", 4)


def dependencies(chunk_id):
    data = {
        "sheet": [{"text": "La pente est $f'(a)$.", "chunk_id": chunk_id}],
        "cards": [{"question": f"Question {i} ?", "answer": "La dérivée.", "chunk_id": chunk_id} for i in range(3)],
    }
    model = SimpleNamespace(completion=SimpleNamespace(text=json.dumps(data), tier=Tier.COMPACT,
                            latency_ms=0, tokens_in=0, tokens_out=0), events=[])
    return {
        "search": SEARCH,
        "rag": SimpleNamespace(search=AsyncMock(return_value=[CHUNK])),
        "client": SimpleNamespace(call=AsyncMock(return_value=model)),
        "cache": CacheStore(":memory:"),
        "tier": Tier.COMPACT,
        "reply_language": "fr",
        "learner_id": "student",
        "fair": None,
    }


async def test_pack_resolves_real_citations_and_reuses_memory_cache():
    args = dependencies(CHUNK.chunk_id)
    first = await build_revision_pack(trace=Trace(), **args)
    again = await build_revision_pack(trace=Trace(), **args)
    assert first == again
    assert first["sheet"][0]["source"] == {"chunk_id": CHUNK.chunk_id, "source": CHUNK.source, "page": 1}
    assert len(first["cards"]) == 3
    assert args["client"].call.await_count == 1


async def test_invalid_citation_cannot_be_returned():
    with pytest.raises(RevisionUnavailable):
        await build_revision_pack(trace=Trace(), **dependencies("made_up"))


async def test_pack_rejects_results_outside_the_verified_pilot_documents():
    args = dependencies(CHUNK.chunk_id)
    args["rag"].search.return_value = [replace(CHUNK, chunk_id="math_4eme_ma_103_chunk_001")]
    with pytest.raises(NotInCourse):
        await build_revision_pack(trace=Trace(), **args)
    args["client"].call.assert_not_called()


async def test_strict_search_keeps_the_section_filter_when_there_are_no_chunks():
    requests = []

    def handle(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={"chunks": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        rag = HttpRag("http://rag", client)
        result = await rag.search("search_courses", SEARCH, fallback_section=False)
    assert result == []
    assert [request["section"] for request in requests] == ["sciences_experimentales"]


async def test_a_late_pack_is_reused_after_the_request_deadline():
    args = dependencies(CHUNK.chunk_id)
    client = args["client"].call
    gate = asyncio.Event()

    async def complete(*_args, **_kwargs):
        await gate.wait()
        return client.return_value

    client.side_effect = complete
    with pytest.raises(TimeoutError):
        async with asyncio.timeout(0.01):
            await build_revision_pack(trace=Trace(), **args)
    gate.set()
    response = await build_revision_pack(trace=Trace(), **args)
    assert response["topic"] == "derivabilite"
    assert await build_revision_pack(trace=Trace(), **args) == response
    assert client.await_count == 1
