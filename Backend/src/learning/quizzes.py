import time
from threading import Lock
from uuid import UUID, uuid4
from sqlalchemy import delete, select

from .models import LearningQuiz

from fastapi import HTTPException
from pydantic import ValidationError

from ..ai.interface import AgentClient
from ..utils import learner_pseudonym
from .models import LearnerProfile
from .schemas import AgentQuiz, QuizOut, QuizQuestionOut

TTL_S = 2 * 60 * 60

_quizzes: dict[str, dict] = {}
_lock = Lock()


def _purge(now: float) -> None:
    for quiz_id in [k for k, v in _quizzes.items() if now - v["created_at"] >= TTL_S]:
        del _quizzes[quiz_id]


def save(db, user_id: UUID, quiz: dict) -> str:
    now = time.time()
    quiz_id = str(uuid4())
    db.add(LearningQuiz(id=quiz_id, user_id=user_id, quiz=quiz, created_at=now))
    db.commit()
    _quizzes[quiz_id] = {"quiz": quiz, "created_at": now, "user_id": user_id}
    return quiz_id


def get(db, quiz_id: str, user_id: UUID) -> dict | None:
    _purge(time.time())
    row = db.scalar(
        select(LearningQuiz).where(
            LearningQuiz.id == quiz_id,
            LearningQuiz.user_id == user_id,
        )
    )
    if row is not None:
        if time.time() - row.created_at < TTL_S:
            return row.quiz
        db.delete(row)
        db.commit()
    entry = _quizzes.get(quiz_id)
    return entry["quiz"] if entry and entry["user_id"] == user_id else None


def clear(db=None) -> None:
    _quizzes.clear()
    if db is not None:
        db.execute(delete(LearningQuiz))
        db.commit()


def issue(db, user_id: UUID, quiz: AgentQuiz, *, group_session: bool = False) -> QuizOut:
    stored = quiz.model_dump()
    if group_session:
        stored["group_session"] = True
    return QuizOut(
        quiz_id=save(db, user_id, stored),
        topic=quiz.topic,
        questions=[QuizQuestionOut(id=q.id, question=q.question, choices=q.choices) for q in quiz.questions],
    )


async def generate(agent: AgentClient, db, user_id: UUID, profile: LearnerProfile, topic: str) -> QuizOut:
    body = await agent.quiz({
        "learner_id": learner_pseudonym(user_id),
        "topic": topic,
        "reply_language": profile.reply_language,
        "grade": profile.grade,
        "section": profile.section,
        "subject": profile.subject,
    })
    try:
        quiz = AgentQuiz.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(502, detail={"error": "agent_error"}) from exc
    return issue(db, user_id, quiz)
