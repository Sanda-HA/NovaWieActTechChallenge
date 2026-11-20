from evaluation.benchmark import by_type, summarize


def row(**overrides):
    return {
        "config": "C", "pass": 0, "id": "q", "type": "direct", "section": "sciences_experimentales",
        "action": "SEARCH_COURSE", "action_ok": True, "badge": "course", "badge_ok": True, "gold_recall": 1.0,
        "repaired": False, "excerpt": False, "capacity": False, "tool_calls": 1, "llm_calls": 2,
        "compact_calls": 1, "mid_calls": 1, "tokens_in": 100, "tokens_out": 50, "cache": None,
        "degraded": False, "wall_ms": 1000, "answer": "", "human_score_1to5": "",
        **overrides,
    }


def test_summarize_reports_repair_and_excerpt_rates():
    rows = [row(), row(repaired=True), row(excerpt=True, badge="course_excerpt", badge_ok=False), row()]
    s = summarize(rows)[0]
    assert s["repair_rate"] == 0.25 and s["excerpt_rate"] == 0.25


def test_summarize_separates_degraded_rows():
    rows = [row(), row(), row(capacity=True, badge="not_found", badge_ok=False, gold_recall=0.0)]
    s = summarize(rows)[0]
    assert s["badge_accuracy"] == 1.0 and s["citation_recall"] == 1.0 and s["capacity_rows"] == 1


def test_by_type_groups_rows():
    rows = [row(type="direct"), row(type="direct", badge_ok=False, gold_recall=0.0), row(type="english")]
    table = {t["type"]: t for t in by_type(rows)}
    assert table["direct"] == {"type": "direct", "n": 2, "badge_accuracy": 0.5, "citation_recall": 0.5}
    assert table["english"]["n"] == 1
