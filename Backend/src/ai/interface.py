import asyncio
import json
import math
import time
from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError

REQUEST_DEADLINE_S = 60.0
TIMEOUT = httpx.Timeout(60.0, connect=5.0)


class _ChatResult(BaseModel):
    response_id: str = Field(min_length=1, max_length=64)
    answer: str
    badge: str | None = Field(default=None, max_length=40)
    topic: str | None = Field(default=None, max_length=200)


class AgentUnavailable(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_503_SERVICE_UNAVAILABLE, {"error": "agent_unavailable"})


class AgentBusy(HTTPException):
    def __init__(self, retry_after: float):
        super().__init__(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            {"error": "agent_busy", "retry_after": retry_after},
            headers={"Retry-After": str(math.ceil(retry_after))},
        )


def _raise_for(resp: httpx.Response) -> None:
    if resp.is_success:
        return
    try:
        detail = resp.json().get("detail")
    except (ValueError, AttributeError):
        detail = None
    if resp.status_code == 503:
        retry_after = detail.get("retry_after") if isinstance(detail, dict) else None
        if isinstance(retry_after, int | float):
            raise AgentBusy(retry_after)
        raise AgentUnavailable()
    if resp.status_code == 422:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail)
    raise HTTPException(status.HTTP_502_BAD_GATEWAY, {"error": "agent_error"})


class AgentClient:
    """Async client for llm_service, the only component allowed to talk to the models."""

    def __init__(self, base_url: str, transport: httpx.AsyncBaseTransport | None = None):
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT, transport=transport)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _request(self, method: str, url: str, **kwargs) -> dict:
        try:
            resp = await asyncio.wait_for(self._http.request(method, url, **kwargs), REQUEST_DEADLINE_S)
        except (httpx.TransportError, asyncio.TimeoutError) as e:
            raise AgentUnavailable() from e
        _raise_for(resp)
        try:
            body = resp.json()
            if not isinstance(body, dict):
                raise ValueError("agent response must be an object")
        except ValueError as e:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, {"error": "agent_error"}) from e
        return body

    async def chat(self, payload: dict) -> dict:
        body = await self._request("POST", "/chat", json=payload)
        try:
            _ChatResult.model_validate(body)
        except ValidationError as e:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, {"error": "agent_error"}) from e
        return body

    async def chat_events(self, payload: dict) -> AsyncIterator[tuple[str, dict]]:
        """Opens the SSE stream eagerly so HTTP errors surface before the response starts."""
        request = self._http.build_request("POST", "/chat/events", json=payload)
        deadline = time.monotonic() + REQUEST_DEADLINE_S
        try:
            resp = await asyncio.wait_for(self._http.send(request, stream=True), REQUEST_DEADLINE_S)
            if not resp.is_success:
                try:
                    await asyncio.wait_for(resp.aread(), max(0.0, deadline - time.monotonic()))
                finally:
                    await resp.aclose()
                _raise_for(resp)
        except (httpx.TransportError, asyncio.TimeoutError) as e:
            raise AgentUnavailable() from e
        return _sse_events(resp, deadline)

    async def feedback(self, response_id: str, helpful: bool, reason: str | None) -> dict:
        body = {"response_id": response_id, "helpful": helpful, "reason": reason}
        return await self._request("POST", "/feedback", json=body)

    async def group_check(self, payload: dict) -> dict:
        return await self._request("POST", "/group/check", json=payload)

    async def diagnostic_items(self) -> dict:
        return await self._request("GET", "/diagnostic")

    async def diagnostic_submit(self, learner_id: str, answers: dict[str, str]) -> dict:
        return await self._request("POST", f"/diagnostic/{learner_id}", json=answers)

    async def topics(self) -> dict:
        return await self._request("GET", "/topics")

    async def progress(self, learner_id: str) -> dict:
        return await self._request("GET", f"/learner/{learner_id}/progress")

    async def purge_learner(self, learner_id: str, session_ids: list[str]) -> dict:
        return await self._request("DELETE", f"/learner/{learner_id}", json={"session_ids": session_ids})


async def _sse_events(resp: httpx.Response, deadline: float | None = None) -> AsyncIterator[tuple[str, dict]]:
    kind, data = "message", []
    deadline = deadline if deadline is not None else time.monotonic() + REQUEST_DEADLINE_S
    lines = resp.aiter_lines()
    try:
        while True:
            try:
                line = await asyncio.wait_for(anext(lines), max(0.0, deadline - time.monotonic()))
            except StopAsyncIteration:
                break
            if line.startswith("event:"):
                kind = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].strip())
            elif not line and data:
                body = json.loads("\n".join(data))
                if not isinstance(body, dict):
                    raise ValueError("agent event must be an object")
                if kind == "result":
                    _ChatResult.model_validate(body)
                yield kind, body
                if kind in ("result", "error"):
                    return
                kind, data = "message", []
        yield "error", {"error": "agent_error"}
    except (httpx.TransportError, asyncio.TimeoutError):
        yield "error", {"error": "agent_unavailable"}
    except ValueError:
        yield "error", {"error": "agent_error"}
    finally:
        await resp.aclose()


def get_agent(request: Request) -> AgentClient:
    return request.app.state.agent


Agent = Annotated[AgentClient, Depends(get_agent)]
