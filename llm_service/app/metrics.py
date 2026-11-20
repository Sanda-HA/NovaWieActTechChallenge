import json
import time
from collections import Counter
from pathlib import Path


class Metrics:
    """Mirrors the per-key numbers the organisers see, plus our own cache, fallback and feedback counts."""

    def __init__(self):
        self.c = Counter()

    def record(self, response: dict, kind: str = "chat") -> None:
        r = response["receipt"]
        self.c["requests"] += 1
        self.c[f"kind_{kind}"] += 1
        for k in ("llm_calls", "compact_calls", "mid_calls", "tokens_in", "tokens_out"):
            self.c[k] += r[k]
        if r["cache"]:
            self.c[f"cache_{r['cache']}"] += 1
        for ev in r["events"]:
            self.c[f"event_{ev}"] += 1
        if "badge" in response:
            self.c[f"badge_{response['badge']}"] += 1

    def feedback(self, helpful: bool) -> None:
        self.c["feedback_helpful" if helpful else "feedback_unhelpful"] += 1

    def snapshot(self) -> dict:
        calls = self.c["llm_calls"] or 1
        requests = max(self.c["requests"], 1)
        hits = sum(v for k, v in self.c.items() if k.startswith("cache_"))
        rated = self.c["feedback_helpful"] + self.c["feedback_unhelpful"]
        return {
            **self.c,
            "mid_share": round(self.c["mid_calls"] / calls, 3),
            "calls_per_request": round(self.c["llm_calls"] / requests, 2),
            "cache_hit_rate": round(hits / requests, 3),
            "helpful_rate": round(self.c["feedback_helpful"] / rated, 3) if rated else None,
        }


class RequestLog:
    """One JSON line per request for the report. Never contains the student's text or the answer."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, response: dict, kind: str = "chat") -> None:
        line = {
            "ts": round(time.time(), 3),
            "kind": kind,
            "response_id": response.get("response_id"),
            "mode": response.get("mode"),
            "badge": response.get("badge") or response.get("verdict"),
            "topic": response.get("topic"),
            "capacity_level": response.get("capacity_level"),
            "degraded": response.get("degraded"),
            "receipt": response["receipt"],
            "steps": [
                {
                    "name": s["name"],
                    "tier": s["tier"],
                    "detail": {k: v for k, v in s["detail"].items() if k not in ("query",)},
                }
                for s in response.get("trace", [])
            ],
        }
        self._append(line)

    def failure(self, kind: str, error: str) -> None:
        """Failed requests leave a line too, so a broken chain shows up in the log."""
        self._append({"ts": round(time.time(), 3), "kind": kind, "error": error})

    def _append(self, line: dict) -> None:
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
