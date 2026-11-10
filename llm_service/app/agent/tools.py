import json
from dataclasses import dataclass
from pathlib import Path

import httpx


class RagUnavailable(Exception):
    pass


CONTENT_TYPES = {"search_courses": "course", "search_exercises": "exercise", "search_definitions": "definition"}
SUBJECT_ALIASES = {"math": "mathematics"}


@dataclass
class Chunk:
    chunk_id: str
    content: str
    score: float
    source: str
    page: int | None
    topic: str = ""
    content_type: str = "course"
    language: str = "fr"


@dataclass
class SearchRequest:
    query: str
    grade: str
    section: str
    subject: str
    language: str
    top_k: int


class HttpRag:
    def __init__(self, base_url: str, client: httpx.AsyncClient | None = None):
        self.base_url = base_url.rstrip("/")
        self.client = client or httpx.AsyncClient(timeout=30)

    async def search(self, tool: str, req: SearchRequest) -> list[Chunk]:
        payload = {
            "question": req.query,
            "grade": req.grade,
            "section": req.section,
            "subject": SUBJECT_ALIASES.get(req.subject, req.subject),
            "language": req.language,
            "top_k": req.top_k,
            "content_type": CONTENT_TYPES[tool],
        }
        try:
            r = await self.client.post(f"{self.base_url}/retrieve", json=payload)
            r.raise_for_status()
            body = r.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise RagUnavailable(str(exc)) from exc
        if not isinstance(body, dict) or not isinstance(body.get("chunks"), list):
            raise RagUnavailable("malformed retrieval response")
        fields = Chunk.__dataclass_fields__
        chunks = []
        for item in body["chunks"]:
            if (
                not isinstance(item, dict)
                or not isinstance(item.get("chunk_id"), str)
                or not isinstance(item.get("content"), str)
                or type(item.get("score")) not in (float, int)
            ):
                continue
            metadata = item.get("metadata")
            if isinstance(metadata, dict):
                item = {**metadata, **item}
            try:
                chunks.append(Chunk(**{k: v for k, v in item.items() if k in fields}))
            except TypeError:
                continue
        return chunks


class FakeRag:
    """Local mathematics-only fixture with keyword overlap scoring."""

    def __init__(self, fixture: Path):
        self.chunks = [Chunk(**c) for c in json.loads(fixture.read_text(encoding="utf-8"))]

    async def search(self, tool: str, req: SearchRequest) -> list[Chunk]:
        if SUBJECT_ALIASES.get(req.subject, req.subject) != "mathematics":
            return []
        words = {w for w in req.query.casefold().split() if len(w) > 3}
        scored = []
        for c in self.chunks:
            if c.content_type != CONTENT_TYPES[tool]:
                continue
            text = (c.content + " " + c.topic).casefold()
            overlap = sum(w in text for w in words) / max(len(words), 1)
            if overlap:
                scored.append(Chunk(**{**c.__dict__, "score": round(overlap, 3)}))
        return sorted(scored, key=lambda c: -c.score)[: req.top_k]
