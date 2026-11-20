"""Course quizzes: multiple-choice questions written only from retrieved course excerpts."""

import asyncio
import json
import re

from app.agent.tools import RagUnavailable, SearchRequest
from app.cache.store import CacheStore, quiz_key
from app.capacity.resilient import CapacityUnavailable, ResilientClient
from app.pedagogy.generator import LANG_NAMES, MAX_TOKENS, template
from app.providers.platform import Tier
from app.trace import NO_CACHE_EVENTS, Trace
from app.validation.validator import chunk_ref, leaks_answer

MIN_QUESTIONS = 3
MAX_QUESTIONS = 4
RETRY_AFTER_S = 30
_pending: dict[str, asyncio.Task] = {}
# "Which statement is true?" lets the model write several true choices, which then grade as wrong;
# a learner never sees "the excerpt", so questions that cite it read as nonsense.
_UNGRADABLE = re.compile(
    r"\b(affirmations?|propositions?|assertions?|propriétés?)\b.*\b(vraies?|correctes?|exactes?|fausses?)\b"
    r"|\b(extraits?|texte)\b|\bstatements?\b",
    re.IGNORECASE,
)


class NotInCourse(Exception):
    pass


class QuizUnavailable(Exception):
    def __init__(self, retry_after: int = RETRY_AFTER_S):
        super().__init__("quiz_unavailable")
        self.retry_after = retry_after


def _valid(raw, by_id: dict) -> dict | None:
    if not isinstance(raw, dict):
        return None
    question, choices, index = raw.get("question"), raw.get("choices"), raw.get("answer_index")
    if not isinstance(question, str) or not question.strip() or _UNGRADABLE.search(question):
        return None
    if not isinstance(choices, list) or len(choices) != 4:
        return None
    if not all(isinstance(c, str) and c.strip() for c in choices):
        return None
    if len({c.strip().casefold() for c in choices}) != 4:
        return None
    if type(index) is not int or not 0 <= index <= 3:
        return None
    chunk = by_id.get(chunk_ref(raw.get("chunk_id")))
    if chunk is None or leaks_answer(question, choices[index]):
        return None
    explanation = raw.get("explanation")
    return {
        "question": question.strip(),
        "choices": [c.strip() for c in choices],
        "answer_index": index,
        "explanation": explanation.strip() if isinstance(explanation, str) else "",
        "source": {"chunk_id": chunk.chunk_id, "source": chunk.source, "page": chunk.page},
    }


def _numbered(questions: list[dict]) -> list[dict]:
    return [{"id": f"q{i}", **q} for i, q in enumerate(questions, 1)]


async def build_quiz(
    topic: str,
    search: SearchRequest,
    *,
    rag,
    client: ResilientClient,
    cache: CacheStore,
    tier: Tier,
    trace: Trace,
    reply_language: str = "fr",
    fair=None,
    learner_id: str = "",
) -> list[dict]:
    try:
        chunks = await rag.search("search_courses", search)
    except RagUnavailable as e:
        trace.events.append("rag_unavailable")
        raise QuizUnavailable from e
    trace.rule("tool", tool="search_courses", ids=[c.chunk_id for c in chunks])
    if not chunks:
        raise NotInCourse
    key = quiz_key(
        topic,
        reply_language,
        grade=search.grade,
        section=search.section,
        subject=search.subject,
        chunk_ids=[c.chunk_id for c in chunks],
    )
    if (cached := cache.get(key)) is not None:
        trace.cache = "artifact"
        return cached["questions"]
    if (pending := _pending.get(key)) is not None:
        trace.events.append("joined_generation")
        return await asyncio.shield(pending)
    if fair and (wait := fair.take(learner_id)) > 0:
        raise CapacityUnavailable(wait)
    # A CPU-only model can outlast the request deadline. Shielding keeps the generation alive so it
    # lands in the cache and a retry reuses it instead of paying for a second model call.
    task = asyncio.create_task(_generate(chunks, search, key, client, cache, tier, trace, reply_language))
    _pending[key] = task
    task.add_done_callback(lambda t: (_pending.pop(key, None), t.cancelled() or t.exception()))
    return await asyncio.shield(task)


async def _generate(chunks, search, key, client, cache, tier, trace, reply_language) -> list[dict]:
    listing = "\n".join(f"[{c.chunk_id}] {c.content[:600]}" for c in chunks)
    messages = [
        {"role": "system", "content": template("quiz").format(reply_language_name=LANG_NAMES[reply_language])},
        {"role": "user", "content": f"Chapitre: {search.query}\n\nExtraits:\n{listing}"},
    ]
    result = await client.call(tier, messages, MAX_TOKENS["quiz"], json_mode=True)
    trace.llm("quiz", result)
    try:
        items = json.loads(result.completion.text)["questions"]
        if not isinstance(items, list):
            raise TypeError
    except (json.JSONDecodeError, KeyError, TypeError):
        raise QuizUnavailable from None
    by_id = {c.chunk_id: c for c in chunks}
    valid = [q for raw in items if (q := _valid(raw, by_id))][:MAX_QUESTIONS]
    if len(valid) < MIN_QUESTIONS:
        raise QuizUnavailable
    questions = _numbered(valid)
    if NO_CACHE_EVENTS.isdisjoint(trace.events):
        cache.put(key, {"questions": questions})
    return questions
