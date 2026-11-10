import pytest

from app.agent.evidence import Verdict, judge
from app.agent.tools import Chunk
from app.capacity.governor import Level
from app.trace import Trace
from tests.fakes import FakeClient


def chunk(cid, score):
    return Chunk(cid, "texte", score, "src", 1)


async def test_rules_decide_clear_cases_without_llm():
    client = FakeClient()
    v, kept = await judge("q", [chunk("a", 0.9)], Level.FULL, client, Trace())
    assert v is Verdict.SUFFICIENT and client.calls == []
    v, kept = await judge("q", [chunk("a", 0.1)], Level.FULL, client, Trace())
    assert v is Verdict.INSUFFICIENT and kept == []


@pytest.mark.parametrize(
    "score,expected",
    [(0.259, Verdict.INSUFFICIENT), (0.26, Verdict.PARTIAL), (0.599, Verdict.PARTIAL), (0.60, Verdict.SUFFICIENT)],
)
async def test_calibrated_evidence_score_boundaries(score, expected):
    chunks = [chunk("a", score)]
    client = FakeClient()
    verdict, kept = await judge("q", chunks, Level.LEAN, client, Trace())
    assert verdict is expected
    assert kept == ([] if expected is Verdict.INSUFFICIENT else chunks)
    assert client.calls == []


async def test_non_object_evidence_json_keeps_chunks():
    chunks = [chunk("a", 0.5), chunk("b", 0.55)]
    verdict, kept = await judge("q", chunks, Level.FULL, FakeClient("[]"), Trace())
    assert verdict is Verdict.PARTIAL and kept == chunks


async def test_grey_zone_uses_compact_at_full_and_rules_when_lean():
    client = FakeClient({"verdict": "sufficient", "keep": ["b"]})
    v, kept = await judge("q", [chunk("a", 0.5), chunk("b", 0.55)], Level.FULL, client, Trace())
    assert v is Verdict.SUFFICIENT and [c.chunk_id for c in kept] == ["b"]
    lean_client = FakeClient()
    v, _ = await judge("q", [chunk("a", 0.5)], Level.LEAN, lean_client, Trace())
    assert v is Verdict.PARTIAL and lean_client.calls == []
