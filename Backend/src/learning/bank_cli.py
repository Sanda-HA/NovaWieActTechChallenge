"""Operator-only commands for generating and reviewing practice-bank candidates."""

import argparse
import asyncio
import json
import math
import re
from datetime import datetime, timedelta
from hashlib import sha256

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..ai.interface import AgentClient
from ..config import settings
from ..Database.core import SessionLocal
from .exam_bank import ROOM_QUIZ_SIZE, topic_known
from .exam_models import ExamQuestion, QuestionFill
from .exam_seed import CURRICULUM, choice_entries, fingerprint
from .exam_topics import LANGUAGES, TOPIC_LABELS
from .schemas import AgentQuiz


MAX_ATTEMPTS = 3
MAX_BATCH = 4
# The AgentClient request deadline is 60 seconds. A lease also covers validation and persistence.
LEASE = timedelta(seconds=120)
_VERSION = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")


def _fill_view(job: QuestionFill) -> dict:
    return {
        "key": job.key, "state": job.state, "attempts": job.attempts,
        "inserted": job.inserted, "error": job.error, "next_attempt_at": job.next_attempt_at,
    }


def _locked_fill(db: Session, key: str) -> QuestionFill:
    return db.scalars(
        select(QuestionFill).where(QuestionFill.key == key).with_for_update()
        .execution_options(populate_existing=True)
    ).one()


def _claim(db: Session, key: str, request: dict) -> tuple[dict, int | None]:
    with db.begin():
        now = db.scalar(select(func.now()))
        inserted = db.execute(insert(QuestionFill).values(
            key=key, request=request, state="running", attempts=1, lease_until=now + LEASE,
        ).on_conflict_do_nothing().returning(QuestionFill.key)).scalar_one_or_none()
        job = _locked_fill(db, key)
        if inserted:
            return _fill_view(job), job.attempts

        if job.state == "succeeded" or (job.state == "running" and job.lease_until > now):
            return _fill_view(job), None
        if job.attempts >= MAX_ATTEMPTS:
            if job.state == "running":
                job.state, job.error, job.lease_until = "failed", "lease_expired", None
            return _fill_view(job), None
        if job.next_attempt_at and job.next_attempt_at > now:
            return _fill_view(job), None

        job.attempts += 1
        job.state = "running"
        job.lease_until = now + LEASE
        job.next_attempt_at = None
        job.error = None
        return _fill_view(job), job.attempts


def _candidate_rows(body: dict, request: dict, key: str) -> list[dict]:
    quiz = AgentQuiz.model_validate(body, strict=True)
    if quiz.topic != request["topic"] or len(quiz.questions) > MAX_BATCH:
        raise ValueError("Unexpected topic or batch size")
    rows = []
    for item in quiz.questions:
        source = item.source
        if source is None:
            raise ValueError("Missing question source")
        prompt, explanation = item.question.strip(), item.explanation.strip()
        choices = [choice.strip() for choice in item.choices]
        for value, limit in [
            (prompt, 4000), (explanation, 4000), (source.source, 1000), (source.chunk_id, 1000),
            *((choice, 1000) for choice in choices),
        ]:
            if not value.strip() or len(value) > limit or "\x00" in value:
                raise ValueError("Invalid question content")
        if len({fingerprint(choice) for choice in choices}) != len(choices):
            raise ValueError("Duplicate choices")
        digest = fingerprint(prompt)
        item_id = "candidate-" + sha256(f"{quiz.topic}\0{request['language']}\0{digest}".encode()).hexdigest()
        options = choice_entries(item_id, choices)
        rows.append({
            **CURRICULUM,
            "id": item_id, "topic": quiz.topic, "language": request["language"],
            "pool": "practice", "review_state": "pending", "version": 1, "fingerprint": digest,
            "concept": quiz.topic, "difficulty": 1, "points": 1, "kind": "choice",
            "prompt": prompt, "choices": options, "answer": {"choice_id": options[item.answer_index]["id"]},
            "explanation": explanation, "source": source.model_dump(mode="json"), "fill_key": key,
        })
    return rows


def _finish(
    db: Session, key: str, attempt: int, *, rows: list[dict] | None = None,
    error: str | None = None, retry_seconds: float = 0,
) -> dict:
    with db.begin():
        job = _locked_fill(db, key)
        if job.state != "running" or job.attempts != attempt:
            return _fill_view(job)
        job.lease_until = None
        if rows is not None:
            inserted = db.execute(insert(ExamQuestion).values(rows).on_conflict_do_nothing()
                                  .returning(ExamQuestion.id)).scalars().all()
            job.state = "succeeded"
            job.inserted = len(inserted)
        else:
            job.state = "failed"
            job.error = error
            if attempt < MAX_ATTEMPTS:
                now = db.scalar(select(func.now()))
                job.next_attempt_at = now + timedelta(seconds=max(30 * attempt, retry_seconds))
        return _fill_view(job)


async def fill_questions(
    db: Session, agent: AgentClient, topic: str, language: str, *, source_version: str, prompt_version: str = "v2",
) -> dict:
    topic, language = topic.strip().lower(), language.strip().lower()
    source_version, prompt_version = source_version.strip(), prompt_version.strip()
    if not topic_known(topic):
        raise HTTPException(404, detail={"error": "unknown_topic"})
    if language not in LANGUAGES or any(not _VERSION.fullmatch(v) for v in (source_version, prompt_version)):
        raise HTTPException(422, detail={"error": "invalid_fill_request"})
    request = {
        **CURRICULUM,
        "topic": topic, "language": language, "source_version": source_version,
        "prompt_version": prompt_version, "generator": "llm_service.quiz",
    }
    key = sha256(json.dumps(request, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    view, attempt = _claim(db, key, request)
    if attempt is None:
        return view

    try:
        body = await agent.quiz({
            **CURRICULUM, "learner_id": "ednova-offline-bank",
            "topic": topic, "reply_language": language,
        })
        rows = _candidate_rows(body, request, key)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        error = detail.get("error")
        if error not in ("agent_busy", "agent_unavailable", "unknown_topic", "not_in_course"):
            error = "agent_error"
        retry = detail.get("retry_after")
        retry = min(retry, 3600) if isinstance(retry, (int, float)) and math.isfinite(retry) else 0
        return _finish(db, key, attempt, error=error, retry_seconds=retry)
    except ValueError:
        return _finish(db, key, attempt, error="invalid_agent_quiz")
    return _finish(db, key, attempt, rows=rows)


def review_question(db: Session, item_id: str, *, reviewer: str, decision: str) -> dict:
    reviewer = reviewer.strip()
    if decision not in ("publish", "reject") or not re.fullmatch(r"[^\x00-\x1f\x7f]{1,100}", reviewer):
        raise HTTPException(422, detail={"error": "invalid_review"})
    row = db.scalar(select(ExamQuestion).where(
        ExamQuestion.id == item_id, ExamQuestion.fill_key.is_not(None),
    ).with_for_update().execution_options(populate_existing=True))
    if row is None:
        raise HTTPException(404, detail={"error": "unknown_candidate"})
    if row.review_state != "pending":
        raise HTTPException(409, detail={"error": "already_reviewed"})
    row.review_state = "published" if decision == "publish" else "rejected"
    row.reviewed_by = reviewer
    row.reviewed_at = db.scalar(select(func.now()))
    db.flush()
    return {"id": row.id, "state": row.review_state, "reviewed_by": row.reviewed_by}


def _pending(db: Session, topic: str | None, language: str | None, limit: int) -> list[dict]:
    query = select(ExamQuestion, QuestionFill).join(QuestionFill, ExamQuestion.fill_key == QuestionFill.key).where(
        ExamQuestion.review_state == "pending",
    )
    if topic:
        query = query.where(ExamQuestion.topic == topic)
    if language:
        query = query.where(ExamQuestion.language == language)
    rows = db.execute(query.order_by(QuestionFill.created_at, ExamQuestion.id).limit(limit))
    return [{
        "id": row.id, "prompt": row.prompt, "choices": row.choices, "answer": row.answer,
        "explanation": row.explanation, "source": row.source, "request": job.request,
    } for row, job in rows]


def _gaps(db: Session, topic: str | None, language: str) -> list[dict]:
    from ..groups.group_memory import cohort_review_concepts

    topics = (topic,) if topic else tuple(TOPIC_LABELS)
    coverage = dict(db.execute(
        select(ExamQuestion.topic, func.count()).where(
            ExamQuestion.topic.in_(topics), ExamQuestion.language == language,
            ExamQuestion.grade == CURRICULUM["grade"], ExamQuestion.section == CURRICULUM["section"],
            ExamQuestion.subject == CURRICULUM["subject"], ExamQuestion.pool == "practice",
            ExamQuestion.review_state == "published", ExamQuestion.kind == "choice",
        ).group_by(ExamQuestion.topic)
    ).all())
    gaps = []
    for slug in topics:
        shortage = ROOM_QUIZ_SIZE - coverage.get(slug, 0)
        if shortage > 0:
            gaps.append({"topic": slug, "shortage": shortage, "concepts": cohort_review_concepts(db, slug)})
    return sorted(gaps, key=lambda gap: (not gap["concepts"], -gap["shortage"], gap["topic"]))


async def _run_fill(db: Session, args: argparse.Namespace) -> dict:
    agent = AgentClient(settings.agent_url)
    try:
        return await fill_questions(
            db, agent, args.topic, args.language, source_version=args.source_version, prompt_version=args.prompt_version,
        )
    finally:
        await agent.aclose()


def _json_default(value: datetime) -> str:
    return value.isoformat()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    fill = actions.add_parser("fill", help="Generate at most one batch and stage it for review.")
    fill.add_argument("topic", choices=TOPIC_LABELS)
    fill.add_argument("language", choices=LANGUAGES)
    fill.add_argument("--source-version", required=True, help="Revision of the deployed course source.")
    fill.add_argument("--prompt-version", default="v2", help="Version of the deployed agent prompt.")
    pending = actions.add_parser("pending", help="List candidates with the evidence and proposed answers for review.")
    pending.add_argument("--topic", choices=TOPIC_LABELS)
    pending.add_argument("--language", choices=LANGUAGES)
    pending.add_argument("--limit", type=int, default=25, metavar="1..100")
    gaps = actions.add_parser("gaps", help="Rank practice shortages using eligible shared review concepts.")
    gaps.add_argument("--topic", choices=TOPIC_LABELS)
    gaps.add_argument("--language", choices=LANGUAGES, required=True)
    for action in ("publish", "reject"):
        decision = actions.add_parser(action, help=f"Record a reviewer's decision to {action} one candidate.")
        decision.add_argument("item_id")
        decision.add_argument("--reviewer", required=True)
    args = parser.parse_args(argv)
    try:
        with SessionLocal() as db:
            if args.action == "fill":
                output = asyncio.run(_run_fill(db, args))
                code = 0 if output["state"] == "succeeded" else 1
            elif args.action == "pending":
                if not 1 <= args.limit <= 100:
                    parser.error("--limit must be between 1 and 100")
                output, code = _pending(db, args.topic, args.language, args.limit), 0
            elif args.action == "gaps":
                output, code = _gaps(db, args.topic, args.language), 0
            else:
                with db.begin():
                    output = review_question(db, args.item_id, reviewer=args.reviewer, decision=args.action)
                code = 0
    except HTTPException as exc:
        output, code = exc.detail, 1
    print(json.dumps(output, indent=2, default=_json_default))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
