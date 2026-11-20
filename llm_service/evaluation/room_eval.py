"""Measure how often the room tutor returns a usable reply against the live model and RAG.

Runs the app in-process (no backend lease), sends each case `--repeat` times and writes a
summary plus every reply, so a reviewer can also judge the mathematics.

    python -m evaluation.room_eval --repeat 3
"""

import argparse
import json
import time
from collections import Counter
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.main import build
from app.config import Settings
from app.pedagogy.room_tutor import _wrong_language
from app.providers.platform import PlatformProvider

HERE = Path(__file__).parent
ROOM_KEY = "evaluation-room-key-0001"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default=str(HERE / "room_eval.jsonl"))
    ap.add_argument("--out", default=str(HERE / "results" / "room_eval.json"))
    ap.add_argument("--repeat", type=int, default=3)
    ap.add_argument("--pause", type=float, default=4.0, help="seconds between requests (provider quota)")
    args = ap.parse_args()

    settings = Settings.from_env()
    cases = [json.loads(line) for line in Path(args.cases).read_text(encoding="utf-8").splitlines() if line.strip()]
    rows = []
    with TestClient(build(settings, PlatformProvider(settings))) as http:
        for case in cases:
            body = {key: value for key, value in case.items() if key != "id"}
            for attempt in range(args.repeat):
                # A fresh room per request: the per-room fair share would otherwise throttle the run.
                room_key = f"{ROOM_KEY}-{case['id']}-{attempt}"
                time.sleep(args.pause)
                reply = http.post("/room/tutor", json={**body, "room_key": room_key}).json()
                receipt = reply.get("receipt") or {}
                rows.append({
                    "id": case["id"], "attempt": attempt, "kind": case["kind"],
                    "language": case.get("reply_language", "fr"),
                    "status": reply.get("status"), "text": reply.get("text"), "citations": reply.get("citations"),
                    "calls": receipt.get("compact_calls"), "events": receipt.get("events", []),
                })

    statuses = Counter(row["status"] for row in rows)
    events = Counter(event for row in rows for event in row["events"])
    generated = [row for row in rows if row["status"] == "generated"]
    by_language = {}
    for language in ("fr", "en", "ar"):
        mine = [row for row in generated if row["language"] == language]
        if mine:
            by_language[language] = {
                "generated": len(mine),
                "correct": sum(not _wrong_language(row["text"], language) for row in mine),
            }
    summary = {
        "language_accuracy": by_language,
        "replies": len(rows),
        "generated_rate": round(statuses["generated"] / len(rows), 3) if rows else 0,
        "statuses": dict(statuses),
        "events": dict(events),
        "mean_calls": round(sum(row["calls"] or 0 for row in rows) / len(rows), 2) if rows else 0,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
