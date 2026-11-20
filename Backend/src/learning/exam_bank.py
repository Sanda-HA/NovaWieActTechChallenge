from decimal import Decimal
from random import Random
import re
from unicodedata import normalize
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .exam_models import ExamBlueprint, ExamQuestion
from .exam_seed import CURRICULUM
from .exam_topics import LANGUAGES, TOPIC_LABELS
from .schemas import AgentQuestion, AgentQuiz


ROOM_QUIZ_SIZE = 3
_DECIMAL = re.compile(r"[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)")


def topic_known(topic: str) -> bool:
    return topic in TOPIC_LABELS


def topic_label(topic: str, language: str) -> str:
    if not topic_known(topic):
        raise HTTPException(404, detail={"error": "unknown_topic"})
    index = LANGUAGES.index(language) if language in LANGUAGES else 0
    return TOPIC_LABELS[topic][index]


def _blueprint_summary(blueprint: ExamBlueprint) -> dict:
    return {
        "id": blueprint.id, "topic": blueprint.topic, "language": blueprint.language,
        "duration_seconds": blueprint.duration_seconds, "item_count": len(blueprint.slots),
        "grade": blueprint.grade, "section": blueprint.section, "subject": blueprint.subject,
        "version": blueprint.version,
    }


def list_blueprints(db: Session) -> list[dict]:
    return [_blueprint_summary(row) for row in db.scalars(select(ExamBlueprint).order_by(ExamBlueprint.id))]


def _insufficient() -> HTTPException:
    return HTTPException(409, detail={"error": "insufficient_questions"})


def assemble_exam(db: Session, blueprint_id: str, *, seed: int) -> dict:
    blueprint = db.get(ExamBlueprint, blueprint_id)
    if blueprint is None:
        raise HTTPException(404, detail={"error": "unknown_blueprint"})
    eligible_ids = {item_id for slot in blueprint.slots for item_id in slot["variants"]}
    eligible = {
        item.id: item for item in db.scalars(select(ExamQuestion).where(
            ExamQuestion.id.in_(eligible_ids),
            ExamQuestion.pool == "competitive", ExamQuestion.review_state == "published",
            ExamQuestion.topic == blueprint.topic, ExamQuestion.language == blueprint.language,
            ExamQuestion.grade == blueprint.grade, ExamQuestion.section == blueprint.section,
            ExamQuestion.subject == blueprint.subject,
        ))
    }
    if set(eligible) != eligible_ids:
        raise _insufficient()

    rng = Random(seed)
    items = []
    tiebreak_ids = []
    for slot in blueprint.slots:
        variants = [eligible[item_id] for item_id in slot["variants"]]
        if not variants or any(
            (row.concept, row.difficulty, row.points) != (slot["concept"], slot["difficulty"], slot["points"])
            for row in variants
        ):
            raise _insufficient()
        row = rng.choice(variants)
        choices = [choice.copy() for choice in row.choices]
        rng.shuffle(choices)
        items.append({
            "id": row.id, "kind": row.kind, "prompt": row.prompt, "choices": choices,
            "answer": row.answer.copy(), "points": row.points, "concept": row.concept,
            "difficulty": row.difficulty, "explanation": row.explanation,
            "source": row.source.copy() if row.source else None, "version": row.version,
        })
        if slot["tiebreak"]:
            tiebreak_ids.append(row.id)
    if len(tiebreak_ids) != 1 or len({item["id"] for item in items}) != len(items):
        raise _insufficient()
    summary = _blueprint_summary(blueprint)
    summary.pop("id")
    return {**summary, "blueprint_id": blueprint_id, "items": items, "tiebreak_question_id": tiebreak_ids[0]}


def _decimal(value: str) -> Decimal | None:
    value = value.strip().replace("−", "-")
    if len(value) > 120 or not _DECIMAL.fullmatch(value):
        return None
    return Decimal(value.replace(",", "."))


def _exact_text(value: str) -> str:
    return " ".join(normalize("NFC", value).casefold().split())


def grade_closed(item: dict, answer: dict | None) -> bool:
    if answer is None:
        return False
    kind, key = item["kind"], item["answer"]
    if kind == "choice":
        return answer.get("choice_id") == key["choice_id"]
    submitted = answer.get("value")
    if not isinstance(submitted, str) or not submitted.strip():
        return False
    if kind == "number":
        expected = _decimal(key["value"])
        return expected is not None and _decimal(submitted) == expected
    return kind == "text" and _exact_text(submitted) == _exact_text(key["value"])


def room_quiz(db: Session, topic: str, language: str, *, seed: int | str | UUID) -> AgentQuiz:
    if not topic_known(topic):
        raise HTTPException(404, detail={"error": "unknown_topic"})
    rows = db.scalars(select(ExamQuestion).where(
        ExamQuestion.topic == topic, ExamQuestion.language == language,
        ExamQuestion.grade == CURRICULUM["grade"], ExamQuestion.section == CURRICULUM["section"],
        ExamQuestion.subject == CURRICULUM["subject"], ExamQuestion.pool == "practice",
        ExamQuestion.review_state == "published", ExamQuestion.kind == "choice",
    ).order_by(ExamQuestion.id)).all()
    if len(rows) < ROOM_QUIZ_SIZE:
        raise _insufficient()

    rng = Random(str(seed) if isinstance(seed, UUID) else seed)
    questions = []
    for row in rng.sample(rows, ROOM_QUIZ_SIZE):
        choices = list(row.choices)
        rng.shuffle(choices)
        questions.append(AgentQuestion(
            id=row.id, question=row.prompt, choices=[choice["text"] for choice in choices],
            answer_index=next(index for index, choice in enumerate(choices) if choice["id"] == row.answer["choice_id"]),
            explanation=row.explanation, source=row.source,
        ))
    return AgentQuiz(topic=topic, questions=questions)


def room_quiz_with_language(
    db: Session, topic: str, language: str, *, seed: int | str | UUID,
) -> tuple[AgentQuiz, str]:
    try:
        return room_quiz(db, topic, language, seed=seed), language
    except HTTPException as exc:
        if (
            language not in LANGUAGES or language == "fr"
            or exc.status_code != 409 or exc.detail != {"error": "insufficient_questions"}
        ):
            raise
    return room_quiz(db, topic, "fr", seed=seed), "fr"
