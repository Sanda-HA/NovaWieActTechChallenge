"""Evaluate retrieval ON ITS OWN (plan: measure retrieval before judging answers).

Metrics: recall@1/3/5 and MRR on answerable questions, hint accuracy on unanswerable / ambiguous ones,
an ablation (BM25 only, dense only, RRF, hybrid + rerank, hybrid without glossary) and threshold calibration.

Gold labels use (document_id, phrase) pairs, not chunk ids, so they survive re-chunking.

Usage:
    python evaluate.py                          # report on all questions with the current thresholds
    python evaluate.py --split test             # report on the held-out half only
    python evaluate.py --calibrate              # grid-search thresholds on the dev half, print them
    python evaluate.py --calibrate --write-thresholds   # ... and save data/thresholds.json
"""
import argparse
import json
import time

from app import config
from app.embeddings import normalize_text
from app.retrieval import load_thresholds, retrieve
from app.store import load_index

ANSWERABLE = ("direct", "paraphrased", "conceptual", "exercise", "multi_chunk")
NO_ANSWER = ("unanswerable", "ambiguous")
KS = (1, 3, 5)


def load_questions(split):
    with open(config.EVAL_PATH, encoding="utf-8") as f:
        items = [json.loads(line) for line in f if line.strip()]
    return [q for q in items if split == "all" or q["split"] == split]


def run(index, q, mode="hybrid", use_glossary=True, top_k=5, min_relevance=0.0, thresholds=None):
    return retrieve(index, q["question"], grade=q["grade"], section=q["section"], subject=q["subject"],
                    language=q["language"], content_type=q["content_type"], top_k=top_k, mode=mode,
                    use_glossary=use_glossary, min_relevance=min_relevance, max_k=5, thresholds=thresholds)


def gold_ranks(q, chunks):
    """For each gold item, the best (smallest) rank of a retrieved chunk that contains it, or None."""
    ranks = []
    for gold in q["gold"]:
        phrase = normalize_text(gold["phrase"])
        found = None
        for c in chunks:
            if c["document_id"] == gold["document_id"] and phrase in normalize_text(c["content"]):
                found = c["rank"]
                break
        ranks.append(found)
    return ranks


def question_metrics(q, chunks):
    ranks = gold_ranks(q, chunks)
    hit = [r for r in ranks if r is not None]
    out = {}
    for k in KS:
        within = [r for r in hit if r <= k]
        out["recall@%d" % k] = len(within) / len(ranks) if q["gold_mode"] == "all" else float(bool(within))
    out["rr"] = 1.0 / min(hit) if hit else 0.0
    return out


def average(rows, key):
    return sum(r[key] for r in rows) / len(rows) if rows else float("nan")


def retrieval_table(index, questions, mode="hybrid", use_glossary=True):
    """Metrics per question type + overall (answerable questions only)."""
    rows = []
    for q in questions:
        if q["type"] not in ANSWERABLE:
            continue
        res = run(index, q, mode=mode, use_glossary=use_glossary)
        m = question_metrics(q, res["chunks"])
        m["type"] = q["type"]
        m["id"] = q["id"]
        rows.append(m)
    table = {}
    for t in list(ANSWERABLE) + ["ALL"]:
        sel = [r for r in rows if t == "ALL" or r["type"] == t]
        if sel:
            table[t] = {"n": len(sel), **{"recall@%d" % k: round(average(sel, "recall@%d" % k), 3) for k in KS},
                        "MRR": round(average(sel, "rr"), 3)}
    return table, rows


def print_table(title, table):
    print("\n" + title)
    print("%-13s %3s %9s %9s %9s %7s" % ("type", "n", "recall@1", "recall@3", "recall@5", "MRR"))
    for t, m in table.items():
        print("%-13s %3d %9.3f %9.3f %9.3f %7.3f" % (t, m["n"], m["recall@1"], m["recall@3"], m["recall@5"], m["MRR"]))


def top_scores(index, questions):
    """Top-1 relevance for each question, with no minimum filter (used for hints and calibration)."""
    out = []
    for q in questions:
        res = run(index, q, top_k=1, min_relevance=0.0)
        out.append({"id": q["id"], "type": q["type"], "score": res["chunks"][0]["score"] if res["chunks"] else 0.0})
    return out


def hint_of(score, thresholds):
    if score >= thresholds["sufficient"]:
        return "sufficient"
    return "partial" if score >= thresholds["partial"] else "insufficient"


def hint_report(scores, thresholds):
    rep = {}
    for t in ANSWERABLE + NO_ANSWER:
        sel = [s for s in scores if s["type"] == t]
        if sel:
            counts = {"sufficient": 0, "partial": 0, "insufficient": 0}
            for s in sel:
                counts[hint_of(s["score"], thresholds)] += 1
            rep[t] = counts
    return rep


def calibrate(scores):
    """Pick thresholds on the given scores.

    sufficient: best balance between answerable questions (>= t) and unanswerable+ambiguous ones (< t).
    partial:    below it the evidence is 'insufficient'; best balance between answerable (>= t) and unanswerable (< t).
    """
    answerable = [s["score"] for s in scores if s["type"] in ANSWERABLE]
    unanswerable = [s["score"] for s in scores if s["type"] == "unanswerable"]
    no_answer = [s["score"] for s in scores if s["type"] in NO_ANSWER]
    if not answerable or not no_answer:
        raise SystemExit("Calibration needs answerable AND unanswerable/ambiguous questions in the chosen split")
    grid = [round(x * 0.01, 2) for x in range(5, 96)]

    def balanced(pos, neg, t):
        tpr = sum(1 for s in pos if s >= t) / len(pos)
        tnr = sum(1 for s in neg if s < t) / len(neg)
        return (tpr + tnr) / 2

    best_s = max(grid, key=lambda t: (balanced(answerable, no_answer, t), t))
    best_p = max([t for t in grid if t <= best_s] or [best_s],
                 key=lambda t: (balanced(answerable, unanswerable or no_answer, t), -t))
    return {"sufficient": best_s, "partial": best_p}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", default="all", choices=["all", "dev", "test"])
    parser.add_argument("--calibrate", action="store_true")
    parser.add_argument("--write-thresholds", action="store_true")
    parser.add_argument("--no-ablation", action="store_true")
    args = parser.parse_args()

    index = load_index(config.INDEX_DIR)
    questions = load_questions(args.split)
    print("Index: %d chunks, backend=%s | questions: %d (%s split)" %
          (index["meta"]["n_chunks"], index["meta"]["backend"], len(questions), args.split))

    report = {"split": args.split, "backend": index["meta"]["backend"], "n_questions": len(questions)}

    if args.calibrate:
        dev = load_questions("dev")
        thresholds = calibrate(top_scores(index, dev))
        print("\nThresholds calibrated on the DEV split only: %s" % thresholds)
        if args.write_thresholds:
            with open(config.THRESHOLDS_PATH, "w", encoding="utf-8") as f:
                json.dump(thresholds, f, indent=2)
            print("Written to %s" % config.THRESHOLDS_PATH)
    else:
        thresholds = load_thresholds()
    report["thresholds"] = thresholds

    started = time.time()
    table, rows = retrieval_table(index, questions)
    print_table("Retrieval (hybrid + rerank + glossary), answerable questions", table)
    report["retrieval"] = table
    misses = [r["id"] for r in rows if r["recall@5"] < 1.0]
    print("\nQuestions with recall@5 < 1 (inspect these first): %s" % (misses or "none"))
    report["misses_at_5"] = misses

    scores = top_scores(index, questions)
    hints = hint_report(scores, thresholds)
    print("\nEvidence hint by question type (thresholds: sufficient>=%.2f, partial>=%.2f)" %
          (thresholds["sufficient"], thresholds["partial"]))
    for t, c in hints.items():
        print("  %-13s sufficient=%d partial=%d insufficient=%d" % (t, c["sufficient"], c["partial"], c["insufficient"]))
    report["hints"] = hints

    if not args.no_ablation:
        print("\nAblation (all answerable questions in this split)")
        report["ablation"] = {}
        for name, mode, glo in (("bm25 only", "bm25", False), ("dense only", "dense", False), ("RRF fusion", "rrf", False),
                                ("hybrid + rerank", "hybrid", False), ("hybrid + rerank + glossary", "hybrid", True)):
            tab, _ = retrieval_table(index, questions, mode=mode, use_glossary=glo)
            m = tab["ALL"]
            print("  %-28s recall@1=%.3f recall@3=%.3f recall@5=%.3f MRR=%.3f" %
                  (name, m["recall@1"], m["recall@3"], m["recall@5"], m["MRR"]))
            report["ablation"][name] = m

    report["seconds"] = round(time.time() - started, 2)
    out_dir = config.ROOT / "reports"
    out_dir.mkdir(exist_ok=True)
    with open(out_dir / ("eval_report_%s.json" % args.split), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print("\nReport saved to reports/eval_report_%s.json" % args.split)


if __name__ == "__main__":
    main()
