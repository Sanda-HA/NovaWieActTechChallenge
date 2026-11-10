from app.agent.tools import Chunk
from app.pedagogy.generator import build_messages, shrink
from app.validation.validator import check_answer, leaks_answer, strip_invented

CHUNKS = [
    Chunk("c1", "Une fonction dérivable ...", 0.9, "Manuel", 41),
    Chunk("c2", "Une fonction continue ...", 0.8, "Manuel", 23),
]


def test_messages_contain_ids_language_and_style():
    msgs = build_messages(
        "explanation", "dérivable ?", level="bac_math", reply_language="fr", style="step_by_step", chunks=CHUNKS
    )
    assert "français" in msgs[0]["content"] and "step_by_step" in msgs[0]["content"]
    assert "[[c1]] (Manuel, p.41)" in msgs[1]["content"]


def test_shrink_halves_context_and_budget():
    msgs = build_messages("explanation", "q", level="b", reply_language="fr", style="s", chunks=CHUNKS)
    small, mt = shrink(msgs, 600)
    assert "[[c1]]" in small[1]["content"] and "[[c2]]" not in small[1]["content"]
    assert mt == 300 and "Question de l'élève: q" in small[1]["content"]


def test_shrink_preserves_repair_messages():
    original = build_messages("explanation", "q", level="b", reply_language="fr", style="s", chunks=CHUNKS)
    repair = [{"role": "assistant", "content": "bad answer"}, {"role": "user", "content": "repair it"}]
    messages, budget = shrink(original + repair, 600)
    assert messages[0] == original[0] and messages[2:] == repair
    assert "[[c1]]" in messages[1]["content"] and "[[c2]]" not in messages[1]["content"]
    assert budget == 300


def test_shrink_without_excerpts_only_halves_budget():
    messages = [{"role": "user", "content": "q"}]
    assert shrink(messages, 80) == (messages, 40)


def test_citations_must_come_from_retrieved_chunks():
    good = check_answer("La fonction est dérivable [[c1]].", {"c1"}, "fr", True)
    assert good.ok and good.citations == ["c1"]
    bad = check_answer("Voir [[c9]].", {"c1"}, "fr", True)
    assert not bad.ok and "invented_citations:c9" in bad.problems
    assert strip_invented("A [[c1]] B [[c9]]", {"c1"}) == "A [[c1]] B "


def test_missing_citation_and_language():
    assert "missing_citation" in check_answer("Une réponse.", {"c1"}, "fr", True).problems
    en = "The derivative is the limit of the rate and you take the limit of the ratio"
    assert "wrong_language:en" in check_answer(en, set(), "fr", False).problems


def test_hint_spoiler_detection():
    assert leaks_answer("Donc f'(1) = 6, bravo", "f'(1) = 6")
    assert not leaks_answer("Quelle est la définition du nombre dérivé ?", "f'(1) = 6")
