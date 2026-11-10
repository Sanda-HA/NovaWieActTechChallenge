"""Runs the frozen evaluation set through several configurations and writes a comparison table.

Usage (inference provider configured through the usual env vars):
    python -m evaluation.benchmark --configs A B C compact --out evaluation/results
"""

import argparse
import asyncio
import csv
import json
import statistics
import tempfile
import time
from dataclasses import replace
from pathlib import Path

import httpx

from app.agent.orchestrator import ChatRequest
from app.config import Settings
from app.providers.platform import PlatformProvider, Tier
from app.routing.router import ModelRouter
from app.wiring import build_service

HERE = Path(__file__).parent
CONFIGS = {
    "A": {"agentic": False, "force": Tier.MID, "label": "A classic RAG (always retrieve, mid writes)"},
    "B": {"agentic": True, "force": Tier.MID, "label": "B agentic RAG, mid writes every answer"},
    "C": {"agentic": True, "force": None, "label": "C agentic + routing + capacity ladder"},
    "compact": {"agentic": True, "force": Tier.COMPACT, "label": "always compact for routed steps"},
}


def load_cases(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


async def run_config(
    name: str, cases: list[dict], settings: Settings, provider: PlatformProvider, repeat: bool
) -> list[dict]:
    cfg = CONFIGS[name]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        isolated = replace(settings, cache_path=f"{tmp}/cache.sqlite3", learner_db_path=f"{tmp}/learners.sqlite3")
        orch = build_service(
            isolated, provider, router=ModelRouter(force=cfg["force"]), agentic=cfg["agentic"], fair=False
        ).orchestrator
        rows = []
        passes = 2 if repeat else 1
        for p in range(passes):
            for case in cases:
                started = time.monotonic()
                r = await orch.handle(
                    ChatRequest(session_id=f"{name}-{case['id']}-{p}", message=case["question"], mode=case["mode"])
                )
                tools = [s for s in r["trace"] if s["name"] == "tool"]
                triage_step = next((s for s in r["trace"] if s["name"] == "triage"), None)
                action = triage_step["detail"].get("action") if triage_step else None
                cited = {s["chunk_id"] for s in r["sources"]}
                rows.append(
                    {
                        "config": name,
                        "pass": p,
                        "id": case["id"],
                        "type": case["type"],
                        "action": action,
                        "action_ok": (action == case["expected_action"]) if action else None,
                        "badge": r["badge"],
                        "badge_ok": r["badge"] == case["expected_badge"],
                        "gold_recall": (
                            len(cited & set(case["gold_chunks"])) / len(case["gold_chunks"])
                            if case["gold_chunks"]
                            else None
                        ),
                        "tool_calls": len(tools),
                        **{
                            k: r["receipt"][k]
                            for k in ("llm_calls", "compact_calls", "mid_calls", "tokens_in", "tokens_out")
                        },
                        "cache": r["receipt"]["cache"],
                        "degraded": r["degraded"],
                        "wall_ms": int((time.monotonic() - started) * 1000),
                        "answer": r["answer"][:300],
                        "human_score_1to5": "",
                    }
                )
        return rows


def summarize(rows: list[dict]) -> list[dict]:
    out = []
    for name in dict.fromkeys(r["config"] for r in rows):
        rs = [r for r in rows if r["config"] == name and r["pass"] == 0]
        rep = [r for r in rows if r["config"] == name and r["pass"] == 1]
        calls = sum(r["llm_calls"] for r in rs) or 1
        lat = sorted(r["wall_ms"] for r in rs)
        recall = [r["gold_recall"] for r in rs if r["gold_recall"] is not None]
        actions = [r["action_ok"] for r in rs if r["action_ok"] is not None]
        out.append(
            {
                "config": CONFIGS[name]["label"],
                "action_accuracy": round(sum(actions) / len(actions), 2) if actions else None,
                "badge_accuracy": round(sum(r["badge_ok"] for r in rs) / len(rs), 2),
                "citation_recall": round(statistics.mean(recall), 2) if recall else None,
                "calls_per_q": round(calls / len(rs), 2),
                "mid_share": round(sum(r["mid_calls"] for r in rs) / calls, 2),
                "tokens_per_q": int(sum(r["tokens_in"] + r["tokens_out"] for r in rs) / len(rs)),
                "p50_ms": lat[len(lat) // 2],
                "p95_ms": lat[min(len(lat) - 1, int(len(lat) * 0.95))],
                "repeat_cache_hit": round(sum(bool(r["cache"]) for r in rep) / len(rep), 2) if rep else None,
                "degraded": sum(r["degraded"] for r in rs),
            }
        )
    return out


def write(rows: list[dict], summary: list[dict], out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    with (out / "runs.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    cols = list(summary[0])
    lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join(str(s[c]) for c in cols) + " |" for s in summary]
    (out / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--configs", nargs="+", default=["A", "B", "C", "compact"])
    ap.add_argument("--cases", default=str(HERE / "agent_eval.jsonl"))
    ap.add_argument("--out", default=str(HERE / "results"))
    ap.add_argument("--no-repeat", action="store_true")
    args = ap.parse_args()
    settings, cases, rows = Settings.from_env(), load_cases(Path(args.cases)), []
    async with httpx.AsyncClient() as http:
        provider = PlatformProvider(settings, http)
        for name in args.configs:
            rows += await run_config(name, cases, settings, provider, repeat=not args.no_repeat)
    write(rows, summarize(rows), Path(args.out))


if __name__ == "__main__":
    asyncio.run(main())
