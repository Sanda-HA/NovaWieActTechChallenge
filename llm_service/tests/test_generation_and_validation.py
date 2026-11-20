from app.agent.tools import Chunk
from app.pedagogy.generator import build_messages, shrink
from app.validation.validator import (
    check_answer,
    leaks_answer,
    resolve_keys,
    strip_invented,
    strip_prompt_echo,
    supporting_chunk,
)

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


def test_short_evidence_keys_are_mapped_back_to_chunk_ids():
    keys = {"math_4eme_ma_013_chunk_016": "E1", "math_4eme_ma_014_chunk_026": "E2"}
    assert resolve_keys("A [[E1]] B [e2] C [[E1, E2]]", keys) == (
        "A [[math_4eme_ma_013_chunk_016]] B [[math_4eme_ma_014_chunk_026]] "
        "C [[math_4eme_ma_013_chunk_016]][[math_4eme_ma_014_chunk_026]]"
    )
    assert resolve_keys("Sur [E3] ou [0, 1] ou [[math_4eme_ma_013_chunk_016]]", keys) == (
        "Sur [E3] ou [0, 1] ou [[math_4eme_ma_013_chunk_016]]"
    )


def test_arabic_answers_pass_for_arabic_and_fail_for_other_languages():
    arabic = "الدالة قابلة للاشتقاق في نقطة إذا كان للنسبة نهاية منتهية عند هذه النقطة، وهذا ما يقوله الدرس."
    assert check_answer(arabic, set(), "ar", False).ok
    assert "wrong_language:ar" in check_answer(arabic, set(), "fr", False).problems
    latin = "The derivative is the limit of the rate of change of the function at a point of the domain."
    assert "wrong_language:not_ar" in check_answer(latin, set(), "ar", False).problems
    with_math = "المشتقة $f'(a) = \\lim_{h \\to 0} \\frac{f(a+h)-f(a)}{h}$ هي نهاية النسبة."
    assert check_answer(with_math, set(), "ar", False).ok


def test_an_uncited_answer_is_matched_to_the_excerpt_it_paraphrases():
    chunks = {"c1": "Une fonction est dérivable si le taux de variation admet une limite finie.", "c2": "Les suites."}
    assert supporting_chunk("Le taux de variation admet une limite finie ici.", chunks) == "c1"
    assert supporting_chunk("Rien en commun avec le cours.", chunks) is None


def test_a_copied_prompt_label_is_cut_from_the_end_of_a_reply():
    assert strip_prompt_echo("Une explication.\n\nQuestion de l'élève: et ensuite ?") == "Une explication."
    assert strip_prompt_echo("Une question de l'élève: reste.") == "Une question de l'élève: reste."


def test_a_foreign_script_inside_a_reply_is_flagged():
    text = "La dérivée est le taux 假设我们有一个函数 de variation."
    assert "foreign_script" in check_answer(text, set(), "fr", False).problems


def test_hint_spoiler_detection():
    assert leaks_answer("Donc f'(1) = 6, bravo", "f'(1) = 6")
    assert not leaks_answer("Quelle est la définition du nombre dérivé ?", "f'(1) = 6")


def test_not_found_has_arabic_text():
    from app.pedagogy.generator import NOT_FOUND

    assert any("؀" <= ch <= "ۿ" for ch in NOT_FOUND["ar"])
