import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "RAG" / "index" / "live" / "chunks.jsonl"
CASES = [
    json.loads(line)
    for line in (ROOT / "llm_service" / "evaluation" / "agent_eval.jsonl").read_text("utf-8").splitlines()
    if line.strip()
]


@pytest.mark.skipif(not LIVE.exists(), reason="RAG/index/live is a build output; build it with RAG/ingest.py")
def test_gold_chunks_exist_in_live_index():
    live = {json.loads(line)["chunk_id"] for line in LIVE.read_text("utf-8").splitlines() if line.strip()}
    missing = {c["id"]: g for c in CASES for g in c["gold_chunks"] if g not in live}
    assert missing == {}


def test_every_case_has_a_profile():
    assert all(
        c.get("section") in {"sciences_experimentales", "mathematiques"}
        and c.get("reply_language") in {"fr", "en", "ar"}
        and c.get("subject") in {"math", "physics"}
        for c in CASES
    )
