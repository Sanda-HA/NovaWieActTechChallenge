import asyncio
import logging
import threading
from collections import OrderedDict

import httpx
from fastapi.testclient import TestClient

from app import main


def prepare(monkeypatch, retrieve):
    monkeypatch.setitem(main.STATE, "cache", OrderedDict())
    monkeypatch.setitem(main.STATE, "hits", 0)
    monkeypatch.setitem(main.STATE, "calls", 0)
    monkeypatch.setattr(main, "get_index", dict)
    monkeypatch.setattr(main, "retrieve", retrieve)


def result():
    return {"chunks": [], "evidence_hint": "insufficient", "diagnostics": {}}


def test_retrieval_logs_never_include_the_question(monkeypatch, caplog):
    prepare(monkeypatch, lambda *args, **kwargs: result())
    with caplog.at_level(logging.INFO, logger="rag"), TestClient(main.app) as client:
        response = client.post(
            "/retrieve", json={"question": "private-student-question-83"}
        )
    assert response.status_code == 200
    records = [record.getMessage() for record in caplog.records if record.name == "rag"]
    assert records and all(
        "private-student-question-83" not in record for record in records
    )


def test_slow_retrieval_does_not_block_other_requests(monkeypatch):
    entered, release = threading.Event(), threading.Event()

    def slow_retrieve(*args, **kwargs):
        entered.set()
        release.wait(timeout=1)
        return result()

    prepare(monkeypatch, slow_retrieve)

    async def check():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=main.app), base_url="http://rag"
        ) as client:
            retrieval = asyncio.create_task(
                client.post("/retrieve", json={"question": "slow test query"})
            )
            try:
                assert await asyncio.to_thread(entered.wait, 2)
                stats = await asyncio.wait_for(client.get("/stats"), 0.2)
                assert stats.status_code == 200
                assert not retrieval.done(), (
                    "Retrieval blocked the event loop until it finished"
                )
            finally:
                release.set()
                await retrieval

    asyncio.run(check())
