"""Measure how often the solo tutor (/chat) returns a real explanation against the live model and RAG.

Runs the app in-process (no backend), sends each case `--repeat` times and writes a summary plus every
answer and the raw model outputs, so a reviewer can also judge the mathematics.

    python -m evaluation.chat_eval --repeat 1
"""

import argparse
import json
import time
from collections import Counter
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.main import build
from app.config import Settings
from app.providers.platform import PlatformProvider

HERE = Path(__file__).parent
USABLE_BADGES = {"course", "general", "clarify"}


class RecordingProvider(PlatformProvider):
    """Keeps the raw text of every model call, so a failed validation can be read afterwards."""

    def __init__(self, settings: Settings):
        super().__init__(settings)
        self.raw: list[dict] = []

    async def complete(self, tier, messages, max_tokens, json_mode=False, temperature=0.2):
        completion = await super().complete(tier, messages, max_tokens, json_mode, temperature)
        self.raw.append({"tier": tier.value, "latency_ms": completion.latency_ms, "text": completion.text})
        return completion


def usable(reply: dict) -> bool:
    return reply.get("badge") in USABLE_BADGES and not reply.get("degraded")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default=str(HERE / "chat_eval.jsonl"))
    ap.add_argument("--out", default=str(HERE / "results" / "chat_eval.json"))
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--pause", type=float, default=4.0, help="seconds between requests (provider quota)")
    args = ap.parse_args()

    settings = Settings.from_env()
    provider = RecordingProvider(settings)
    cases = [json.loads(line) for line in Path(args.cases).read_text(encoding="utf-8").splitlines() if line.strip()]
    rows = []
    with TestClient(build(settings, provider)) as http:
        for case in cases:
            for attempt in range(args.repeat):
                # A fresh learner and session per request: the per-learner fair share would throttle the run.
                who = f"eval-{case['id']}-{attempt}-{int(time.time())}"
                time.sleep(args.pause)
                provider.raw.clear()
                started = time.monotonic()
                reply = http.post("/chat", json={
                    "session_id": who, "learner_id": who, "message": case["message"],
                    "reply_language": case["reply_language"],
                }).json()
                receipt = reply.get("receipt") or {}
                rows.append({
                    "id": case["id"], "attempt": attempt, "chapter": case["chapter"],
                    "language": case["reply_language"], "message": case["message"],
                    "usable": usable(reply), "badge": reply.get("badge"), "degraded": reply.get("degraded"),
                    "wall_s": round(time.monotonic() - started, 1), "calls": receipt.get("llm_calls"),
                    "events": receipt.get("events", []),
                    "validation": [s["detail"] for s in reply.get("trace", []) if s["name"] == "validation"],
                    "answer": reply.get("answer"), "sources": reply.get("sources"),
                    "raw_model_outputs": list(provider.raw),
                })

    n = len(rows)
    summary = {
        "replies": n,
        "usable_rate": round(sum(row["usable"] for row in rows) / n, 3) if n else 0,
        "badges": dict(Counter(row["badge"] for row in rows)),
        "events": dict(Counter(event for row in rows for event in row["events"])),
        "mean_calls": round(sum(row["calls"] or 0 for row in rows) / n, 2) if n else 0,
        "mean_wall_s": round(sum(row["wall_s"] for row in rows) / n, 1) if n else 0,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
