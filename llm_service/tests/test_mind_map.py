import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.agent.tools import FakeRag
from app.api.main import build
from tests.test_api import fake_platform

REQUEST = {
    "learner_id": "test-learner", "topic": "derivabilite", "grade": "4eme_annee_secondaire",
    "section": "sciences_experimentales", "subject": "math", "reply_language": "fr",
    "document_id": "math_4eme_se_002", "title": "Dérivabilité", "source_revision": 1,
}
CHUNKS = [
    {"chunk_id": f"math_4eme_se_002_chunk_{i:03}", "heading": f"Notion {i}", "content": f"Définition {i}.",
     "language": "fr", "source": "Cours de démonstration", "page": i}
    for i in range(1, 4)
]


def draft(chunks=CHUNKS):
    return {"branches": [
        {"group_id": i, "label": f"Notion {i}", "summary": f"Définition {i}.",
         "source_ids": [chunk["chunk_id"]], "children": []}
        for i, chunk in enumerate(chunks, 1)
    ]}


@pytest.mark.parametrize(("topic", "document", "title", "subject"), [
    ("derivabilite", "math_4eme_se_002", "Dérivabilité", "math"),
    ("immunite", "svt_4eme_se_101", "Immunité", "svt"),
])
def test_generation_attaches_index_excerpts_and_reuses_cache(settings, monkeypatch, topic, document, title, subject):
    request = {**REQUEST, "topic": topic, "document_id": document, "title": title, "subject": subject}
    chunks = [{**chunk, "chunk_id": f"{document}_chunk_{i:03}"} for i, chunk in enumerate(CHUNKS, 1)]
    retrieve = AsyncMock(return_value=chunks)
    monkeypatch.setattr(FakeRag, "chapter_excerpts", retrieve)
    with TestClient(build(settings, fake_platform(settings, json.dumps(draft(chunks))))) as client:
        r = client.post("/mind-map", json=request)
        assert r.status_code == 200
        data = r.json()
        assert data["root"]["label"] == title
        assert data["sources"][0]["excerpt"] == chunks[0]["content"]
        retrieve.assert_awaited_once_with(document, request["grade"], request["section"], subject)
        assert client.post("/mind-map", json=request).json()["receipt"]["cache"] == "artifact"


@pytest.mark.parametrize("invalid", ["foreign_ref", "oversized_label", "missing_heading"])
def test_invalid_generation_is_rejected(settings, monkeypatch, invalid):
    monkeypatch.setattr(FakeRag, "chapter_excerpts", AsyncMock(return_value=CHUNKS), raising=False)
    value = draft()
    if invalid == "foreign_ref":
        value["branches"][0]["source_ids"] = [CHUNKS[1]["chunk_id"]]
    elif invalid == "oversized_label":
        value["branches"][0]["label"] = "x" * 73
    else:
        value["branches"].pop()
    with TestClient(build(settings, fake_platform(settings, json.dumps(value)))) as client:
        assert client.post("/mind-map", json=REQUEST).status_code == 502


def test_missing_sources_do_not_use_inference(settings, monkeypatch):
    monkeypatch.setattr(FakeRag, "chapter_excerpts", AsyncMock(return_value=[]), raising=False)
    with TestClient(build(settings, fake_platform(settings))) as client:
        assert client.post("/mind-map", json=REQUEST).json()["detail"]["error"] == "not_in_course"
