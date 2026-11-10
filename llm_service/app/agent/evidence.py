import json
from enum import Enum

from app.agent.tools import Chunk
from app.capacity.governor import Level
from app.capacity.resilient import ResilientClient
from app.providers.platform import Tier
from app.trace import Trace

# from wie-act RAG/data/thresholds.json; re-copy after every recalibration
HIGH = 0.60
LOW = 0.26


class Verdict(str, Enum):
    SUFFICIENT = "sufficient"
    PARTIAL = "partial"
    INSUFFICIENT = "insufficient"


CHECK_SYSTEM = """Tu vérifies si des extraits de cours suffisent pour répondre à une question d'élève.
Réponds UNIQUEMENT en JSON: {"verdict": "sufficient|partial|insufficient", "keep": ["chunk_id", ...]}
"keep" liste seulement les extraits utiles."""


async def judge(
    question: str, chunks: list[Chunk], level: Level, client: ResilientClient, trace: Trace
) -> tuple[Verdict, list[Chunk]]:
    if not chunks:
        trace.rule("evidence", verdict="insufficient", reason="no_chunks")
        return Verdict.INSUFFICIENT, []
    top = max(c.score for c in chunks)
    if top >= HIGH:
        trace.rule("evidence", verdict="sufficient", top=top)
        return Verdict.SUFFICIENT, chunks
    if top < LOW:
        trace.rule("evidence", verdict="insufficient", top=top)
        return Verdict.INSUFFICIENT, []
    if level >= Level.LEAN:
        trace.rule("evidence", verdict="partial", top=top, reason="grey_zone_no_llm")
        return Verdict.PARTIAL, chunks
    listing = "\n".join(f"[{c.chunk_id}] {c.content[:400]}" for c in chunks)
    messages = [
        {"role": "system", "content": CHECK_SYSTEM},
        {"role": "user", "content": f"Question: {question}\nExtraits:\n{listing}"},
    ]
    result = await client.call(Tier.COMPACT, messages, max_tokens=120, json_mode=True)
    try:
        data = json.loads(result.completion.text)
        if not isinstance(data, dict):
            raise TypeError("invalid evidence result")
        verdict = Verdict(data["verdict"])
        keep = set(data.get("keep") or [c.chunk_id for c in chunks])
    except (KeyError, ValueError, TypeError, AttributeError):
        verdict, keep = Verdict.PARTIAL, {c.chunk_id for c in chunks}
    trace.llm("evidence", result, verdict=verdict.value, top=top)
    kept = [c for c in chunks if c.chunk_id in keep]
    return verdict, (kept if verdict is not Verdict.INSUFFICIENT else [])
