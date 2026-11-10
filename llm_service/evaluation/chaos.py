"""Saturation test: fire concurrent students at the service while the platform refuses calls.

Configure a dedicated test endpoint that can return saturation responses before running:
    python -m evaluation.chaos --students 12
Pass criteria: every request gets an answer (possibly degraded or a wait message), zero exceptions.
"""

import argparse
import asyncio
import json
import tempfile
from collections import Counter
from dataclasses import replace

from app.agent.orchestrator import ChatRequest
from app.config import Settings
from app.metrics import Metrics
from app.wiring import build_service

QUESTIONS = [
    "C'est quoi une fonction dérivable ?",
    "Est-ce que f(x) = |x - 1| est dérivable en 1 ?",
    "Différence entre continue et dérivable ?",
    "C'est quoi une fonction dérivable ?",
]


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--students", type=int, default=12)
    args = ap.parse_args()
    metrics, outcomes, errors = Metrics(), Counter(), []
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        settings = replace(Settings.from_env(), cache_path=f"{tmp}/c.sqlite3", learner_db_path=f"{tmp}/l.sqlite3")
        svc = build_service(settings, fair=False)
        orch, governor = svc.orchestrator, svc.governor

        async def student(i: int) -> None:
            mode = "guided" if i % 3 == 1 else "explain"
            try:
                r = await orch.handle(ChatRequest(session_id=f"s{i}", message=QUESTIONS[i % len(QUESTIONS)], mode=mode))
                metrics.record(r)
                if r["badge"] == "course_excerpt":
                    outcomes["course_excerpt_while_saturated"] += 1
                elif r.get("retry_after"):
                    outcomes["wait_message"] += 1
                else:
                    outcomes["degraded" if r["degraded"] else "full"] += 1
            except Exception as exc:  # the point of the test is that this never happens
                errors.append(repr(exc))

        await asyncio.gather(*(student(i) for i in range(args.students)))
    print(
        json.dumps(
            {"outcomes": outcomes, "errors": errors, "final_level": governor.level.name, "metrics": metrics.snapshot()},
            indent=2,
            ensure_ascii=False,
        )
    )
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    asyncio.run(main())
