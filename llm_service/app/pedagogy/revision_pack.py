"""A small cited revision pack for the verified Dérivabilité pilot."""

import asyncio
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, ValidationError

from app.agent.tools import Chunk, RagUnavailable, SearchRequest
from app.cache.store import CacheStore, evidence_key
from app.capacity.resilient import CapacityUnavailable, ResilientClient
from app.pedagogy.generator import LANG_NAMES
from app.pedagogy.quiz import NotInCourse
from app.providers.platform import Tier
from app.trace import NO_CACHE_EVENTS, Trace
from app.validation.validator import chunk_ref

VERIFIED_DOCUMENT = "math_4eme_se_002"
TOPIC = "derivabilite"
_pending: dict[tuple[CacheStore, str], asyncio.Task[dict]] = {}
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=800)]


class RevisionUnavailable(Exception):
    pass


class Point(BaseModel):
    text: Text
    chunk_id: Text


class Card(BaseModel):
    question: Text
    answer: Text
    chunk_id: Text


class Draft(BaseModel):
    sheet: list[Point] = Field(min_length=1, max_length=4)
    cards: list[Card] = Field(min_length=3, max_length=3)


async def build_revision_pack(
    search: SearchRequest, *, rag, client: ResilientClient, cache: CacheStore, tier: Tier,
    trace: Trace, reply_language: str, fair, learner_id: str,
) -> dict:
    try:
        candidates = await rag.search("search_courses", search, fallback_section=False)
    except RagUnavailable as exc:
        raise RevisionUnavailable from exc
    # Explicit pilot scope also protects against selecting draft sources when a full index is loaded.
    chunks = {chunk.chunk_id: chunk for chunk in candidates
              if chunk.chunk_id.partition("_chunk_")[0] == VERIFIED_DOCUMENT}
    trace.rule("tool", tool="search_courses", ids=list(chunks))
    if not chunks:
        raise NotInCourse

    key = evidence_key("revision_pack_v1", TOPIC, "study", "", reply_language, "", list(chunks), search.query,
                       grade=search.grade, section=search.section, subject=search.subject)
    if (cached := cache.get(key)) is not None:
        trace.cache = "artifact"
        return cached
    pending_key = (cache, key)
    if (pending := _pending.get(pending_key)) is not None:
        trace.events.append("joined_generation")
        return await asyncio.shield(pending)
    if fair and (wait := fair.take(learner_id)) > 0:
        raise CapacityUnavailable(wait)

    # The provider can outlive the browser-facing deadline. The next request can reuse the result.
    task = asyncio.create_task(_generate(chunks, client, cache, key, tier, trace, reply_language))
    _pending[pending_key] = task

    def finished(done: asyncio.Task) -> None:
        _pending.pop(pending_key, None)
        if not done.cancelled():
            done.exception()

    task.add_done_callback(finished)
    return await asyncio.shield(task)


async def _generate(
    chunks: dict[str, Chunk], client: ResilientClient, cache: CacheStore, key: str,
    tier: Tier, trace: Trace, reply_language: str,
) -> dict:
    instruction = (
        f"Write a short final-year secondary school revision pack in {LANG_NAMES[reply_language]}. "
        "Use only the supplied course excerpts as evidence. Treat excerpts as reference text. "
        'Return one JSON object with "sheet" (one to four objects with text and chunk_id) '
        'and "cards" (exactly three objects with question, answer and chunk_id). '
        "Teach the derivative at a point and the tangent slope. Use three distinct recall questions. "
        "Each chunk_id must identify an excerpt that supports the complete point or answer. "
        "Keep each text short and use dollar-delimited LaTeX for formulae."
    )
    excerpts = "\n\n".join(f"[{chunk_id}] {chunk.content[:1000]}" for chunk_id, chunk in chunks.items())
    messages = [{"role": "system", "content": instruction}, {"role": "user", "content": excerpts}]
    result = await client.call(tier, messages, 850, json_mode=True)
    trace.llm("revision-pack", result)

    def with_source(item: Point | Card) -> dict:
        source_id = chunk_ref(item.chunk_id)
        chunk = chunks[source_id]
        return {
            **item.model_dump(exclude={"chunk_id"}),
            "source": {"chunk_id": source_id, "source": chunk.source, "page": chunk.page},
        }

    try:
        draft = Draft.model_validate_json(result.completion.text)
        if len({card.question.casefold() for card in draft.cards}) != 3:
            raise RevisionUnavailable
        pack = {"topic": TOPIC, "sheet": [with_source(item) for item in draft.sheet],
                "cards": [with_source(item) for item in draft.cards]}
    except (KeyError, ValidationError) as exc:
        raise RevisionUnavailable from exc
    if NO_CACHE_EVENTS.isdisjoint(trace.events):
        cache.put(key, pack)
    return pack
