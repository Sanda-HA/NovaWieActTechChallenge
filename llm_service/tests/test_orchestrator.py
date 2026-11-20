import asyncio
from dataclasses import replace
from pathlib import Path

import pytest

from app.agent.orchestrator import ChatRequest
from app.agent.tools import FakeRag, RagUnavailable, SearchRequest
from app.cache.store import exact_key
from app.capacity.fairness import FairShare
from app.capacity.resilient import CapacityUnavailable
from app.providers.platform import CeilingExceeded, Tier
from tests.fakes import FakeClient

FIXTURE = Path(__file__).parent / "fixtures" / "chunks.json"
TRIAGE_COURSE = {
    "action": "SEARCH_COURSE",
    "topic": "derivabilite",
    "difficulty": 1,
    "language": "fr",
    "queries": ["fonction dérivable limite taux variation"],
}
TRIAGE_EXO = {"action": "SEARCH_EXERCISES", "topic": "derivabilite", "queries": ["exercice dérivabilité"]}
LADDER = {
    "final_answer": "non dérivable en 1",
    "rungs": [
        "Que vaut le taux à droite ?",
        "Rappel: dérivable = même limite des deux côtés.",
        "Calcule la limite à gauche.",
        "Solution complète: ... non dérivable en 1",
    ],
}
ANSWER = "f est dérivable en a si le taux admet une limite finie [[math_4sc_derivee_001]]."


class DownRag:
    async def search(self, tool, req):
        raise RagUnavailable("down")


class RaisingClient(FakeClient):
    async def call(self, *args, **kwargs):
        raise CapacityUnavailable(30)


class WaitingClient(FakeClient):
    async def call(self, *args, **kwargs):
        await asyncio.sleep(10)


async def test_slow_generation_returns_a_degraded_course_fallback(make):
    orch, _ = make(client=WaitingClient())
    orch.request_timeout_s = 0.02
    orch.fallback_timeout_s = 0.02
    response = await asyncio.wait_for(orch.handle(ask("fonction dérivable limite taux variation")), timeout=0.2)
    assert response["badge"] == "course_excerpt"
    assert response["degraded"]
    assert "request_timeout" in response["receipt"]["events"]


async def test_slow_retrieval_cannot_extend_the_fallback_indefinitely(make):
    class SlowRag:
        async def search(self, *args):
            await asyncio.sleep(10)

    orch, _ = make(client=WaitingClient(), rag=SlowRag())
    orch.request_timeout_s = 0.02
    orch.fallback_timeout_s = 0.02
    response = await asyncio.wait_for(orch.handle(ask("fonction dérivable limite taux variation")), timeout=0.2)
    assert response["badge"] is None
    assert response["retry_after"] > 0
    assert response["degraded"]


async def test_waiting_for_the_learners_lock_is_also_bounded(make):
    orch, _ = make()
    orch.request_timeout_s = 0.02
    orch.fallback_timeout_s = 0.02
    lock = orch.learner_locks["s"]
    await lock.acquire()
    try:
        response = await asyncio.wait_for(orch.handle(ask("fonction dérivable limite taux variation")), timeout=0.2)
    finally:
        lock.release()
    assert response["badge"] == "course_excerpt"


async def test_wellbeing_response_does_not_wait_for_an_existing_turn(make):
    orch, client = make()
    lock = orch.learner_locks["s"]
    await lock.acquire()
    try:
        response = await asyncio.wait_for(orch.handle(ask("je veux mourir")), timeout=0.2)
    finally:
        lock.release()
    assert response["badge"] == "wellbeing"
    assert client.calls == []


def ask(message, session="s", **kw):
    return ChatRequest(session_id=session, message=message, **kw)


async def test_selected_subject_controls_search_and_generation_even_if_triage_says_math(make):
    subjects = []

    class RecordingRag:
        async def search(self, tool, req):
            subjects.append(req.subject)
            return []

    orch, client = make(TRIAGE_COURSE, "Voici une explication générale.", rag=RecordingRag())
    reply = await orch.handle(ask("Comment fonctionne un circuit ?", subject="physics", subject_selected=True))
    assert subjects and set(subjects) == {"physics"}
    assert "Physique" in client.calls[-1][1][0]["content"]
    assert reply["badge"] == "not_found" and reply["sources"] == []
    assert reply["topic"] == "autre"


async def test_demo_retrieval_does_not_return_math_chunks_for_a_different_subject():
    rag = FakeRag(FIXTURE)
    query = SearchRequest("fonction dérivable limite taux variation", "4eme_annee_secondaire",
                          "mathematiques", "math", "fr", 4)
    assert await rag.search("search_courses", query)
    assert await rag.search("search_courses", replace(query, subject="physics")) == []


async def test_grounded_explanation_uses_two_compact_calls_cites_and_suggests_an_exercise(make):
    orch, client = make(TRIAGE_COURSE, ANSWER)
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert r["badge"] == "course" and r["sources"][0]["page"] == 41
    assert [c[0] for c in client.calls] == [Tier.COMPACT, Tier.COMPACT]
    assert r["receipt"]["mid_calls"] == 0 and r["topic"] == "derivabilite"
    assert r["next_step"]["kind"] == "exercise" and r["next_step"]["request"]["mode"] == "guided"
    assert r["response_id"]


async def test_repeat_question_hits_exact_cache_with_zero_calls(make):
    orch, client = make(TRIAGE_COURSE, ANSWER)
    await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    r = await orch.handle(ask("c'est quoi une fonction DÉRIVABLE", session="t"))
    assert r["receipt"]["llm_calls"] == 0 and r["receipt"]["cache"] == "exact"
    assert r["next_step"]["kind"] == "exercise" and len(client.calls) == 2


async def test_explicit_presentation_reaches_prompt_and_separates_cached_answers(make):
    triage = {"action": "DIRECT_ANSWER"}
    orch, client = make(triage, "Réponse visuelle.", triage, "Réponse par étapes.")
    await orch.handle(ask("Comment réviser ?", preferred_style="visual"))
    answer = await orch.handle(ask("Comment réviser ?", session="t", preferred_style="step_by_step"))
    assert "Style préféré de l'élève: visual." in client.calls[1][1][0]["content"]
    assert "Style préféré de l'élève: step_by_step." in client.calls[3][1][0]["content"]
    assert answer["answer"] == "Réponse par étapes."


async def test_paraphrases_are_not_assumed_equivalent_by_the_rewritten_query(make):
    orch, client = make(TRIAGE_COURSE, ANSWER, TRIAGE_COURSE, ANSWER)
    await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    r = await orch.handle(ask("définition de dérivable stp"))
    assert r["receipt"]["cache"] is None and r["receipt"]["llm_calls"] == 2


@pytest.mark.parametrize("field", ["grade", "section", "subject"])
async def test_exact_cache_separates_curriculum_fields(make, field):
    triage = {"action": "DIRECT_ANSWER"}
    orch, client = make(triage, "Première réponse.", triage, "Réponse pour l'autre programme.")
    await orch.handle(ask("Comment réviser ?"))
    response = await orch.handle(ask("Comment réviser ?", session="t", **{field: "other"}))
    assert response["answer"] == "Réponse pour l'autre programme."
    assert response["receipt"]["cache"] is None and len(client.calls) == 4


async def test_evidence_cache_separates_distinct_rewritten_queries(make):
    rewritten = {**TRIAGE_COURSE, "queries": ["fonction dérivable limite taux variation finie"]}
    second_answer = "La réciproque n'est pas vraie. [[math_4sc_derivee_001]]."
    orch, client = make(TRIAGE_COURSE, ANSWER, rewritten, second_answer)
    await orch.handle(ask("Dérivable implique continue ?"))
    response = await orch.handle(ask("Continue implique dérivable ?", session="t"))
    assert response["answer"] == second_answer
    assert response["receipt"]["cache"] is None and len(client.calls) == 4


async def test_follow_up_is_never_cached(make):
    follow = {**TRIAGE_COURSE, "standalone": False}
    orch, client = make(follow, ANSWER)
    await orch.handle(ask("et pourquoi ?"))
    assert orch.cache.get(exact_key("et pourquoi ?", "explain", "bac_math", "fr", "step_by_step")) is None


async def test_repeated_explicit_hints_never_reveal_the_solution(make):
    orch, client = make(TRIAGE_EXO, LADDER)
    await orch.handle(ask("Calcule la dérivée de |x-1| en 1 ?", mode="guided"))
    for _ in range(4):
        response = await orch.handle(ask("Un indice", mode="guided", action="hint"))
        assert LADDER["final_answer"] not in response["answer"]
        assert "Solution complète" not in response["answer"]
    assert orch.sessions.get("s").ladder is not None
    assert len(client.calls) == 2


async def test_same_rewritten_query_does_not_reuse_a_different_answer(make):
    second = "La dérivée de x³ est 3x² [[math_4sc_derivee_001]]."
    orch, _ = make(TRIAGE_COURSE, ANSWER, TRIAGE_COURSE, second)
    await orch.handle(ask("Quelle est la dérivée de x² ?"))
    response = await orch.handle(ask("Quelle est la dérivée de x³ ?", session="t"))
    assert response["answer"] == second
    assert response["receipt"]["cache"] is None


@pytest.mark.parametrize("boundary", ["grade", "section", "subject", "evidence"])
async def test_ladders_do_not_cross_curriculum_or_evidence_boundaries(make, boundary):
    other = {**LADDER, "rungs": ["Un autre exercice : que cherche-t-on ?", *LADDER["rungs"][1:]]}
    orch, _ = make(TRIAGE_EXO, LADDER, TRIAGE_EXO, other)
    question = "f(x)=|x-1| dérivable en 1 ?"
    await orch.handle(ask(question, session="a", mode="guided"))
    fields = {}
    if boundary == "evidence":
        orch.rag.chunks = [replace(c, chunk_id=c.chunk_id + "_revised") for c in orch.rag.chunks]
    else:
        fields[boundary] = "other"
    response = await orch.handle(ask(question, session="b", mode="guided", **fields))
    assert response["answer"] == "Un autre exercice : que cherche-t-on ?"
    assert response["receipt"]["cache"] is None


async def test_downvote_later_hint_invalidates_ladder_and_active_sessions(make):
    orch, _ = make(TRIAGE_EXO, LADDER)
    await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", mode="guided"))
    response = await orch.handle(ask("Un indice", mode="guided", action="hint"))
    assert orch.feedback(response["response_id"], helpful=False) == 1
    assert orch.sessions.get("s").ladder is None


async def test_concurrent_attempts_count_one_solved_exercise(make, monkeypatch):
    orch, _ = make(TRIAGE_EXO, LADDER)
    await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", mode="guided"))
    entered, release = asyncio.Event(), asyncio.Event()

    async def grade(*args):
        entered.set()
        await release.wait()
        return True, "", None

    monkeypatch.setattr("app.agent.orchestrator.grade_attempt", grade)
    first = asyncio.create_task(orch.handle(ask("réponse calculée", mode="guided", action="attempt")))
    await entered.wait()
    second = asyncio.create_task(orch.handle(ask("réponse calculée", mode="guided", action="attempt")))
    await asyncio.sleep(0)
    release.set()
    await asyncio.gather(first, second)
    stats = orch.learners.get("s").topics["derivabilite"]
    assert (stats.attempts, stats.solved) == (1, 1)


async def test_deleted_learner_cannot_recreate_state(make):
    orch, _ = make(TRIAGE_COURSE, ANSWER)
    await orch.handle(ask("fonction dérivable limite taux variation", learner_id="deleted"))
    await orch.purge("deleted", ["s"])
    assert orch.learners.db.execute("SELECT count(*) FROM learners WHERE id = 'deleted'").fetchone()[0] == 0
    assert "s" not in orch.sessions._s
    with pytest.raises(Exception, match="learner deleted"):
        await orch.handle(ask("another request", learner_id="deleted"))


async def test_thumbs_down_removes_the_cached_answer(make):
    orch, client = make(TRIAGE_COURSE, ANSWER, TRIAGE_COURSE, ANSWER)
    first = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert orch.feedback(first["response_id"], helpful=False) == 2  # exact + evidence entries
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?", session="t"))
    assert r["receipt"]["cache"] is None and r["receipt"]["llm_calls"] == 2


@pytest.mark.parametrize("cache_kind", ["exact", "evidence"])
async def test_downvote_cache_hit_removes_remaining_aliases(make, cache_kind):
    orch, _ = make(TRIAGE_COURSE, ANSWER, *([TRIAGE_COURSE] if cache_kind == "evidence" else []))
    question = "C'est quoi une fonction dérivable ?"
    original = await orch.handle(ask(question))
    if cache_kind == "evidence":
        orch.cache.delete([exact_key(question, "explain", "bac_math", "fr", "step_by_step")])
    hit = await orch.handle(ask(question, session="t"))
    assert hit["receipt"]["cache"] == cache_kind
    assert "_aliases" not in original and "_aliases" not in hit
    assert orch.feedback(hit["response_id"], helpful=False) == (2 if cache_kind == "exact" else 1)
    assert orch.cache.db.execute("SELECT count(*) FROM cache").fetchone() == (0,)


async def test_an_invented_citation_is_stripped_without_a_repair_call(make):
    orch, client = make(TRIAGE_COURSE, "Le taux de variation admet une limite finie [[fake_99]].")
    r = await orch.handle(ask("dérivable ?"))
    assert [s["name"] for s in r["trace"]].count("repair") == 0 and len(client.calls) == 2
    assert "fake_99" not in r["answer"] and r["badge"] == "course" and "citation_inferred" in r["receipt"]["events"]
    assert len(r["sources"]) == 1


async def test_the_prompt_names_excerpts_by_short_keys_and_replies_are_mapped_back(make):
    orch, client = make(TRIAGE_COURSE, "Le taux admet une limite finie [[E1]].")
    r = await orch.handle(ask("dérivable ?"))
    user = client.calls[-1][1][1]["content"]
    assert "[[E1]] (" in user and "math_4sc_derivee_001" not in user
    assert "[[math_4sc_derivee_001]]" in r["answer"] and "citation_inferred" not in r["receipt"]["events"]
    assert [s["chunk_id"] for s in r["sources"]] == ["math_4sc_derivee_001"]


async def test_a_missing_citation_is_not_worth_a_second_model_call(make):
    orch, client = make(TRIAGE_COURSE, "Le taux de variation admet une limite finie quand h tend vers zéro.")
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert len(client.calls) == 2 and r["badge"] == "course" and "citation_inferred" in r["receipt"]["events"]
    assert [s["chunk_id"] for s in r["sources"]] == ["math_4sc_derivee_001"] and not r["degraded"]


async def test_an_uncited_answer_unrelated_to_the_excerpts_is_not_labelled_as_the_course(make):
    orch, client = make(TRIAGE_COURSE, "Une explication correcte mais sans rapport.")
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert len(client.calls) == 2 and r["badge"] == "general" and r["sources"] == []
    assert "uncited_answer" in r["receipt"]["events"] and not r["degraded"]


WRONG_LANGUAGE = "The derivative is the limit of the rate and you take the limit of the ratio of the function."


async def test_a_failed_repair_shows_the_course_passage_not_the_bad_draft(make):
    orch, client = make(TRIAGE_COURSE, WRONG_LANGUAGE, WRONG_LANGUAGE + " Again.")
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert "repair_failed" in r["receipt"]["events"]
    assert r["badge"] == "course_excerpt" and WRONG_LANGUAGE not in r["answer"]
    assert len(r["sources"]) == 1 and r["sources"][0]["source"] in r["answer"]
    repair_prompt = client.calls[-1][1][-1]["content"]
    assert "langue demandée" in repair_prompt and "wrong_language" not in repair_prompt
    validation = [s["detail"] for s in r["trace"] if s["name"] == "validation"]
    assert [v["stage"] for v in validation] == ["first_draft", "after_repair"]


async def test_no_time_for_a_repair_answers_with_the_passage(make):
    orch, client = make(TRIAGE_COURSE, WRONG_LANGUAGE)
    orch._affordable_repair = lambda *args: None
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert len(client.calls) == 2 and "repair_skipped_budget" in r["receipt"]["events"]
    assert r["badge"] == "course_excerpt" and WRONG_LANGUAGE not in r["answer"]


def test_a_repair_is_only_attempted_when_it_can_finish(make):
    import time

    from app.agent.orchestrator import _deadline

    orch, _ = make()
    _deadline.set(time.monotonic() + 30)
    assert orch._affordable_repair(Tier.MID, Tier.COMPACT, 8) is Tier.MID  # 8 s x 2.5 fits in 27 s
    assert orch._affordable_repair(Tier.MID, Tier.COMPACT, 14) is Tier.COMPACT  # mid would not fit, compact does
    assert orch._affordable_repair(Tier.MID, Tier.COMPACT, 40) is None
    _deadline.set(None)
    assert orch._affordable_repair(Tier.MID, Tier.COMPACT, 40) is Tier.MID


async def test_a_timed_out_turn_is_still_saved_in_the_session(make):
    orch, _ = make(client=WaitingClient())
    orch.request_timeout_s = 0.02
    orch.fallback_timeout_s = 0.02
    response = await orch.handle(ask("fonction dérivable limite taux variation"))
    assert "request_timeout" in response["receipt"]["events"]
    history = list(orch.sessions.get("s").history)
    assert history[0] == ("élève", "fonction dérivable limite taux variation")
    assert history[1] == ("ednova", response["answer"])
    assert any(s["name"] == "request_timeout" and "lock_wait_s" in s["detail"] for s in response["trace"])


async def test_unknown_topic_abstains(make):
    triage = {"action": "SEARCH_COURSE", "topic": "autre", "queries": ["photosynthèse chlorophylle"]}
    orch, client = make(triage, "Je n'ai pas trouvé ça dans ton cours. Piste générale ...")
    r = await orch.handle(ask("La photosynthèse ?"))
    assert r["badge"] == "not_found" and r["sources"] == [] and r["next_step"] is None


async def test_rag_down_gives_a_labelled_general_answer(make):
    orch, client = make(TRIAGE_COURSE, "Réponse générale.", rag=DownRag())
    r = await orch.handle(ask("C'est quoi une fonction dérivable ?"))
    assert r["badge"] == "general" and "rag_unavailable" in r["receipt"]["events"]


async def test_rag_outage_does_not_seed_cache(make):
    orch, _ = make(TRIAGE_COURSE, "Réponse générale.", TRIAGE_COURSE, ANSWER)
    rag = orch.rag
    orch.rag = DownRag()
    question = "C'est quoi une fonction dérivable ?"
    outage = await orch.handle(ask(question))
    assert "rag_unavailable" in outage["receipt"]["events"] and not outage["degraded"]
    orch.rag = rag
    recovered = await orch.handle(ask(question, session="t"))
    assert recovered["badge"] == "course" and recovered["receipt"]["cache"] is None


async def test_failed_language_repair_is_not_cached(make):
    wrong_language = "The derivative is the limit of the rate and you take the limit [[math_4sc_derivee_001]]."
    orch, _ = make(TRIAGE_COURSE, wrong_language, wrong_language, TRIAGE_COURSE, ANSWER)
    question = "C'est quoi une fonction dérivable ?"
    response = await orch.handle(ask(question))
    assert "repair_failed" in response["receipt"]["events"] and not response["degraded"]
    assert response["badge"] == "course_excerpt" and wrong_language not in response["answer"]
    retry = await orch.handle(ask(question, session="t"))
    assert retry["answer"] == ANSWER and retry["receipt"]["cache"] is None


async def test_mid_saturation_is_labelled_degraded_and_not_cached(make):
    triage = {**TRIAGE_COURSE, "needs_reasoning": True}
    orch, client = make(triage, ANSWER, fallback_on_mid=True)
    r = await orch.handle(ask("Démontre que f est dérivable"))
    assert r["degraded"] and client.calls[1][0] is Tier.MID
    assert (
        orch.cache.get(exact_key("Démontre que f est dérivable", "explain", "bac_math", "fr", "step_by_step")) is None
    )


async def test_no_model_available_still_shows_the_course_passage(make):
    orch, _ = make(client=RaisingClient())
    r = await orch.handle(ask("fonction dérivable limite taux variation"))
    assert r["badge"] == "course_excerpt" and r["sources"][0]["chunk_id"] == "math_4sc_derivee_001"
    assert r["degraded"] and r["retry_after"] == 30
    r2 = await orch.handle(ask("La photosynthèse ?", session="t"))
    assert r2["badge"] is None and "31 s" in r2["answer"]


async def test_ceiling_refusal_returns_course_excerpt(make):
    class CeilingClient(FakeClient):
        async def call(self, *args, **kwargs):
            raise CeilingExceeded("too large")

    orch, _ = make(client=CeilingClient())
    response = await orch.handle(ask("fonction dérivable limite taux variation"))
    assert response["badge"] == "course_excerpt" and response["retry_after"] == 0
    assert "ceiling_exceeded" in response["receipt"]["events"]


async def test_distress_message_gets_support_and_no_model_call(make):
    orch, client = make()
    r = await orch.handle(ask("j'en ai marre, je veux mourir"))
    assert r["badge"] == "wellbeing" and client.calls == []
    assert orch.sessions.get("s").history == type(orch.sessions.get("s").history)(maxlen=6)


async def test_distress_before_redaction_leaves_no_learner(make):
    orch, client = make()
    response = await orch.handle(ask("Je m'appelle Alice je veux mourir", learner_id="p1"))
    assert response["badge"] == "wellbeing"
    assert client.calls == []
    assert orch.learners.db.execute("SELECT id FROM learners").fetchall() == []


async def test_personal_data_never_reaches_the_model(make):
    orch, client = make(TRIAGE_COURSE, ANSWER)
    await orch.handle(ask("Je m'appelle Amira, 22345678, c'est quoi une fonction dérivable ?"))
    sent = " ".join(m["content"] for _, msgs in client.calls for m in msgs)
    assert "Amira" not in sent and "22345678" not in sent


async def test_fair_share_limits_one_learner_without_calling_the_model(make):
    orch, client = make(TRIAGE_COURSE, ANSWER, fair=FairShare(per_minute=1, burst=1))
    await orch.handle(ask("C'est quoi une fonction dérivable ?", learner_id="p1"))
    r = await orch.handle(ask("Et une fonction continue, c'est quoi exactement ?", learner_id="p1"))
    assert r["retry_after"] > 0 and len(client.calls) == 2 and not r["degraded"]


async def test_guided_mode_compiles_once_then_serves_hints_for_free_and_records_mastery(make):
    orch, client = make(TRIAGE_EXO, LADDER)
    first = await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", session="g", mode="guided", learner_id="p"))
    assert first["hint_rung"] == 0 and client.calls[1][0] is Tier.MID
    second = await orch.handle(ask("un indice stp", session="g", mode="guided", learner_id="p"))
    assert second["hint_rung"] == 1 and second["receipt"]["llm_calls"] == 0
    third = await orch.handle(ask("donc non dérivable en 1", session="g", mode="guided", learner_id="p"))
    assert "Bravo" in third["answer"] and third["receipt"]["llm_calls"] == 0
    assert third["next_step"]["kind"] == "next_topic"  # solved with 1 hint
    stats = orch.learners.get("p").topics["derivabilite"]
    assert (stats.attempts, stats.solved, stats.hints_used) == (1, 1, 1)


async def test_new_exercise_during_an_exercise_gets_its_own_ladder(make):
    orch, client = make(TRIAGE_EXO, LADDER, TRIAGE_EXO, LADDER)
    await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", session="g", mode="guided"))
    r = await orch.handle(ask("Et g(x)=|x+2| en -2 ?", session="g", mode="guided", action="new_question"))
    assert len(client.calls) == 4 and r["hint_rung"] == 0  # triage + a new ladder, not graded as an attempt
    assert client.calls[2][1][0]["content"].startswith("Tu es le module de tri")


async def test_same_exercise_for_another_student_reuses_the_ladder(make):
    orch, client = make(TRIAGE_EXO, LADDER, TRIAGE_EXO)
    await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", session="a", mode="guided"))
    r = await orch.handle(ask("f(x)=|x-1| dérivable en 1 ?", session="b", mode="guided"))
    assert r["receipt"]["cache"] == "artifact" and r["receipt"]["llm_calls"] == 1


async def test_classic_baseline_skips_triage(make):
    orch, client = make(ANSWER, agentic=False)
    r = await orch.handle(ask("fonction dérivable limite taux variation"))
    assert r["receipt"]["llm_calls"] == 1 and r["receipt"]["mid_calls"] == 1
