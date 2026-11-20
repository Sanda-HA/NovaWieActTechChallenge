import asyncio
import json
from contextlib import nullcontext
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.exc import DBAPIError

from src.ai.interface import AgentClient


def test_exam_is_seeded_and_balanced_with_stable_choice_ids(db):
    from src.learning.exam_bank import assemble_exam, list_blueprints

    [blueprint] = list_blueprints(db)
    assert blueprint["id"] == "derivabilite-fr-v1"
    assert blueprint["item_count"] == 5
    assert blueprint["duration_seconds"] == 180
    assert set(blueprint).isdisjoint({"items", "slots", "answer"})
    exam = assemble_exam(db, blueprint["id"], seed=10)
    assert exam == assemble_exam(db, blueprint["id"], seed=10)
    assert exam == json.loads(json.dumps(exam))
    assert [item["difficulty"] for item in exam["items"]] == [1, 1, 2, 2, 3]
    assert len({item["concept"] for item in exam["items"]}) == 5
    assert sum(item["points"] for item in exam["items"]) == 9
    assert exam["tiebreak_question_id"] == exam["items"][-1]["id"]
    variants, choices_by_item = set(), {}
    for seed in range(12):
        items = assemble_exam(db, blueprint["id"], seed=seed)["items"]
        variants.add(tuple(item["id"] for item in items))
        for item in items:
            assert item["explanation"] and item["source"]
            choices = {choice["id"]: choice["text"] for choice in item["choices"]}
            assert choices == choices_by_item.setdefault(item["id"], choices)
            if item["kind"] == "choice":
                assert item["answer"]["choice_id"] in choices
    assert len(variants) > 1


def test_unknown_blueprint_is_explicit(db):
    from src.learning.exam_bank import assemble_exam

    with pytest.raises(HTTPException) as failure:
        assemble_exam(db, "missing", seed=0)
    assert (failure.value.status_code, failure.value.detail["error"]) == (404, "unknown_blueprint")


def test_blueprint_with_an_unavailable_pinned_question_fails_explicitly(db):
    from src.learning.exam_bank import assemble_exam
    from src.learning.exam_models import ExamBlueprint

    db.add(ExamBlueprint(
        id="fixture-gap", topic="derivabilite", language="fr", duration_seconds=90,
        grade="4eme_annee_secondaire", section="mathematiques", subject="math", version=1,
        slots=[{"concept": "product_rule", "difficulty": 3, "points": 3, "tiebreak": True,
                "variants": ["exam-v1-product-a", "missing"]}],
    ))
    db.flush()
    with pytest.raises(HTTPException) as failure:
        assemble_exam(db, "fixture-gap", seed=0)
    assert (failure.value.status_code, failure.value.detail["error"]) == (409, "insufficient_questions")


def test_published_content_cannot_change_in_place(db):
    from src.learning.exam_models import ExamBlueprint, ExamQuestion

    for model, change in [(ExamBlueprint, {"duration_seconds": 1}), (ExamQuestion, {"prompt": "changed"})]:
        with pytest.raises(DBAPIError, match="immutable"):
            with db.begin_nested():
                db.execute(update(model).values(**change))


def test_ordinary_room_quiz_uses_own_language_specific_pool(db):
    from src.learning.exam_bank import assemble_exam, room_quiz

    reserved = {item["id"] for seed in range(15) for item in
                assemble_exam(db, "derivabilite-fr-v1", seed=seed)["items"]}
    for lang, opening in [("fr", "Quelle"), ("en", "What"), ("ar", "ما")]:
        quiz = room_quiz(db, "derivabilite", lang, seed=4)
        assert quiz.topic == "derivabilite"
        assert len(quiz.questions) == 3
        assert any(item.question.startswith(opening) for item in quiz.questions)
        assert reserved.isdisjoint(item.id for item in quiz.questions)
    with pytest.raises(HTTPException) as failure:
        room_quiz(db, "suites", "ar", seed=4)
    assert (failure.value.status_code, failure.value.detail["error"]) == (409, "insufficient_questions")


def test_room_quiz_reports_the_actual_language_and_falls_back_to_french(db):
    from src.learning.exam_bank import room_quiz, room_quiz_with_language
    from src.learning.sample_quiz import sample_quiz

    for language in ("en", "ar"):
        quiz, actual = room_quiz_with_language(db, "derivabilite", language, seed=7)
        assert actual == language and quiz == room_quiz(db, "derivabilite", language, seed=7)
        sample = sample_quiz(language).questions[0]
        assert all(item.id != sample.id and item.question != sample.question for item in quiz.questions)

        quiz, actual = room_quiz_with_language(db, "suites", language, seed=7)
        assert actual == "fr" and quiz == room_quiz(db, "suites", "fr", seed=7)

    with pytest.raises(HTTPException) as unknown:
        room_quiz_with_language(db, "missing", "en", seed=7)
    assert (unknown.value.status_code, unknown.value.detail) == (404, {"error": "unknown_topic"})
    with pytest.raises(HTTPException) as unsupported:
        room_quiz_with_language(db, "derivabilite", "de", seed=7)
    assert (unsupported.value.status_code, unsupported.value.detail) == (409, {"error": "insufficient_questions"})


def test_french_room_practice_covers_the_pilot_chapters(db):
    from src.learning.exam_bank import room_quiz

    chapters = (
        "limites_continuite", "suites", "derivabilite", "etude_fonctions", "primitives", "integrales",
        "logarithme", "exponentielle", "equations_differentielles", "nombres_complexes", "probabilites",
        "statistiques", "geometrie_espace", "isometries_plan", "deplacements_antideplacements",
        "similitudes", "coniques", "divisibilite_z", "identite_bezout",
    )
    ids = set()
    for topic in chapters:
        quiz = room_quiz(db, topic, "fr", seed=1)
        assert quiz.topic == topic
        assert len(quiz.questions) == 3
        for item in quiz.questions:
            assert item.id not in ids
            assert len(set(item.choices)) == 4
            ids.add(item.id)


def test_closed_grading_rejects_ambiguous_numbers():
    from src.learning.exam_bank import grade_closed

    decimal = {"kind": "number", "answer": {"value": "-2.5"}}
    assert grade_closed(decimal, {"value": " −2,50 "})
    for wrong in ("-2.5001", "-2.5e0", "-5/2", "-2_5", "NaN", "-2.5 cm"):
        assert not grade_closed(decimal, {"value": wrong})
    assert not grade_closed(decimal, None)
    choice = {"kind": "choice", "answer": {"choice_id": "q:a"}}
    assert grade_closed(choice, {"choice_id": "q:a"})
    assert not grade_closed(choice, {"choice_id": "q:b"})
    assert not grade_closed(choice, {"value": "q:a"})


@pytest.fixture
def clean_generated_bank(db):
    from src.learning.exam_models import ExamQuestion, QuestionFill

    yield
    # Review decisions are tested in a rollback-only transaction; fills make durable changes.
    db.rollback()
    test_fills = QuestionFill.request["source_version"].astext == "fixture"
    db.execute(delete(ExamQuestion).where(
        ExamQuestion.review_state == "pending", ExamQuestion.fill_key.in_(select(QuestionFill.key).where(test_fills)),
    ))
    db.execute(delete(QuestionFill).where(test_fills))
    db.commit()


def test_fill_coalesces_with_running_request_and_keeps_duplicates_in_review(db, clean_generated_bank):
    from src.Database.core import SessionLocal
    from src.learning.bank_cli import fill_questions, review_question
    from src.learning.exam_bank import room_quiz
    from src.learning.exam_models import ExamQuestion

    observed = []

    async def fake_agent(request):
        payload = json.loads(request.content)
        assert request.url.path == "/quiz"
        assert payload["topic"] == "suites"
        assert payload["reply_language"] == "en"
        observed.append(payload)
        with SessionLocal() as concurrent_db:
            in_progress = await fill_questions(concurrent_db, agent, "suites", "en", source_version="fixture")
            assert in_progress["state"] == "running"
        first = {"id": "q1", "question": "What is the limit of $1/n$?", "choices": ["0", "1", "2", "3"],
                 "answer_index": 0, "explanation": "The denominator tends to infinity.",
                 "source": {"chunk_id": "unit-suite-limit", "source": "Exercise notes", "page": 3}}
        duplicate = {**first, "id": "q2", "question": "What   is the LIMIT of $1/n$ ?",
                     "choices": ["1", "3", "0", "2"], "answer_index": 2}
        arithmetic = {**first, "id": "q3", "question": "What is the common difference of 0, 3, 6, 9?",
                      "answer_index": 3, "explanation": "Each term exceeds the preceding term by three."}
        geometric = {**first, "id": "q4", "question": "What is the common ratio of 2, 4, 8, 16?",
                     "answer_index": 2, "explanation": "Each term is double the preceding term."}
        return httpx.Response(200, json={"topic": "suites", "questions": [first, duplicate, arithmetic, geometric]})

    async def run():
        nonlocal agent
        agent = AgentClient("http://offline-fixture", transport=httpx.MockTransport(fake_agent))
        try:
            result = await fill_questions(db, agent, "suites", "en", source_version="fixture")
            assert result["state"] == "succeeded" and result["inserted"] == 3
            assert result == await fill_questions(db, agent, "suites", "en", source_version="fixture")
        finally:
            await agent.aclose()

    agent = None
    asyncio.run(run())
    assert len(observed) == 1
    rows = db.scalars(select(ExamQuestion).where(
        ExamQuestion.review_state == "pending", ExamQuestion.fill_key.is_not(None),
    )).all()
    assert len(rows) == 3
    assert all(row.pool == "practice" and row.source["chunk_id"] == "unit-suite-limit" for row in rows)
    with pytest.raises(HTTPException):
        room_quiz(db, "suites", "en", seed=0)
    for row in rows:
        review_question(db, row.id, reviewer="math-reviewer", decision="publish")
    quiz = room_quiz(db, "suites", "en", seed=1)
    assert {item.question: item.choices[item.answer_index] for item in quiz.questions} == {
        "What is the limit of $1/n$?": "0",
        "What is the common difference of 0, 3, 6, 9?": "3",
        "What is the common ratio of 2, 4, 8, 16?": "2",
    }
    with pytest.raises(HTTPException) as failure:
        review_question(db, rows[0].id, reviewer="another-reviewer", decision="reject")
    assert failure.value.status_code == 409


def test_failed_fill_is_delayed_and_bounded(db, clean_generated_bank):
    from src.learning.bank_cli import fill_questions
    from src.learning.exam_models import QuestionFill

    calls = []

    def busy(request):
        calls.append(request.url.path)
        return httpx.Response(503, json={"detail": {"retry_after": 120}})

    async def run():
        agent = AgentClient("http://offline-fixture", transport=httpx.MockTransport(busy))
        try:
            for attempt in range(1, 4):
                result = await fill_questions(db, agent, "suites", "ar", source_version="fixture")
                assert result["state"] == "failed" and result["attempts"] == attempt
                assert len(calls) == attempt
                assert result == await fill_questions(db, agent, "suites", "ar", source_version="fixture")
                assert len(calls) == attempt
                if attempt < 3:
                    assert result["next_attempt_at"] > datetime.now(timezone.utc) + timedelta(seconds=90)
                    db.execute(update(QuestionFill).values(next_attempt_at=datetime.now(timezone.utc)))
                    db.commit()
            assert result["next_attempt_at"] is None
        finally:
            await agent.aclose()

    asyncio.run(run())


def test_gaps_ranks_coverage_using_only_eligible_cohort_concepts(db, capsys, monkeypatch):
    from src.auth.models import User
    from src.groups.group_memory_models import GroupConceptEvidence
    from src.groups.models import StudyRoom
    from src.learning import bank_cli

    users = [User(pseudo=f"coverage{i}", password_hash="fixture") for i in range(5)]
    db.add_all(users)
    db.flush()
    rooms = [
        StudyRoom(owner_id=users[i].id, name="Coverage fixture", invite_code=f"TEST{i:02}")
        for i in range(3)
    ]
    db.add_all(rooms)
    db.flush()

    now = datetime.now(timezone.utc)
    for index, user in enumerate(users):
        for concept, eligible in [
            ("probabilites_conditionnelles", True),
            ("denombrement", False),
            ("loi_binomiale", index < 4),
        ]:
            db.add(GroupConceptEvidence(
                room_id=rooms[index % 3].id, user_id=user.id, activity="coverage-fixture",
                topic="probabilites", concept=concept, signal="missed", count=9,
                personal=True, shared=eligible, created_at=now,
            ))
    db.flush()
    monkeypatch.setattr(bank_cli, "SessionLocal", lambda: nullcontext(db))

    def forbidden_agent(*args, **kwargs):
        pytest.fail("The gaps report must not initialize the agent")

    monkeypatch.setattr(bank_cli, "AgentClient", forbidden_agent)
    focus = {"topic": "probabilites", "shortage": 3, "concepts": ["probabilites_conditionnelles"]}
    assert bank_cli.main(["gaps", "--language", "en"]) == 0
    report = json.loads(capsys.readouterr().out)
    assert report[0] == focus
    assert len(report) == 18
    assert all(gap["topic"] != "derivabilite" for gap in report)
    assert all(gap["concepts"] == [] for gap in report[1:])

    assert bank_cli.main(["gaps", "--language", "en", "--topic", "probabilites"]) == 0
    assert json.loads(capsys.readouterr().out) == [focus]
    assert bank_cli.main(["gaps", "--language", "fr", "--topic", "probabilites"]) == 0
    assert json.loads(capsys.readouterr().out) == []
