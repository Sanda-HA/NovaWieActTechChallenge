import asyncio

import httpx
import pytest
from fastapi import HTTPException

from src.ai import interface
from src.ai.interface import AgentClient, _sse_events


@pytest.mark.asyncio
@pytest.mark.parametrize("content", ["not json", "[]", "{}", '{"response_id":"r"}',
                                     '{"response_id":42,"answer":"x"}', '{"response_id":"r","answer":"x","topic":{}}'])
async def test_malformed_agent_success_becomes_a_controlled_502(content):
    client = AgentClient("http://agent", transport=httpx.MockTransport(lambda req: httpx.Response(200, text=content)))
    try:
        with pytest.raises(HTTPException) as error:
            await client.chat({"message": "test"})
        assert error.value.status_code == 502
        assert error.value.detail == {"error": "agent_error"}
    finally:
        await client.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize("body", ['event: stage\ndata: {"stage":"searching"}\n\n', 'event: result\ndata: broken\n\n',
                                  'event: result\ndata: {}\n\n'])
async def test_missing_or_malformed_terminal_event_produces_an_error(body):
    events = [item async for item in _sse_events(httpx.Response(200, text=body))]
    assert events[-1] == ("error", {"error": "agent_error"})


@pytest.mark.asyncio
async def test_stream_stops_at_its_terminal_event():
    body = 'event: error\ndata: {"error":"internal_error"}\n\nevent: stage\ndata: {"stage":"writing"}\n\n'
    events = [item async for item in _sse_events(httpx.Response(200, text=body))]
    assert events == [("error", {"error": "internal_error"})]


@pytest.mark.asyncio
async def test_unresponsive_agent_has_an_overall_deadline(monkeypatch):
    monkeypatch.setattr(interface, "REQUEST_DEADLINE_S", 0.02, raising=False)

    async def blocked(request):
        await asyncio.sleep(10)

    client = AgentClient("http://agent", transport=httpx.MockTransport(blocked))
    try:
        with pytest.raises(HTTPException) as error:
            await asyncio.wait_for(client.chat({"message": "test"}), 0.2)
        assert error.value.status_code == 503
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_stalled_stream_ends_with_an_error(monkeypatch):
    monkeypatch.setattr(interface, "REQUEST_DEADLINE_S", 0.02, raising=False)

    class StalledStream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield b'event: stage\ndata: {"stage":"searching"}\n\n'
            await asyncio.sleep(10)

    async def consume():
        return [item async for item in _sse_events(httpx.Response(200, stream=StalledStream()))]

    events = await asyncio.wait_for(consume(), 0.2)
    assert events[-1] == ("error", {"error": "agent_unavailable"})
