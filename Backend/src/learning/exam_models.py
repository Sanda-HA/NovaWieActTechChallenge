from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..Database.core import Base


class QuestionFill(Base):
    __tablename__ = "exam_question_fills"
    __table_args__ = (
        CheckConstraint("state IN ('running', 'succeeded', 'failed')", name="ck_exam_fills_state"),
        CheckConstraint("attempts BETWEEN 1 AND 3", name="ck_exam_fills_attempts"),
    )

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    request: Mapped[dict] = mapped_column(JSONB)
    state: Mapped[str] = mapped_column(String(12))
    attempts: Mapped[int]
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    inserted: Mapped[int] = mapped_column(server_default="0")
    error: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    __table_args__ = (
        UniqueConstraint("grade", "section", "subject", "topic", "language", "fingerprint", name="uq_exam_question_prompt"),
        CheckConstraint("pool IN ('competitive', 'practice')", name="ck_exam_questions_pool"),
        CheckConstraint("review_state IN ('pending', 'published', 'rejected')", name="ck_exam_questions_state"),
        CheckConstraint("kind IN ('choice', 'number', 'text')", name="ck_exam_questions_kind"),
        CheckConstraint("difficulty BETWEEN 1 AND 3 AND points > 0 AND version > 0", name="ck_exam_questions_scale"),
        CheckConstraint("language IN ('fr', 'en', 'ar')", name="ck_exam_questions_language"),
        CheckConstraint("fill_key IS NULL OR pool = 'practice'", name="ck_exam_questions_generated_pool"),
        CheckConstraint(
            "fill_key IS NULL OR review_state = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)",
            name="ck_exam_questions_reviewer",
        ),
        Index("ix_exam_questions_practice", "grade", "section", "subject", "topic", "language", "pool", "review_state"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    topic: Mapped[str] = mapped_column(String(40))
    language: Mapped[str] = mapped_column(String(2))
    grade: Mapped[str] = mapped_column(String(40))
    section: Mapped[str] = mapped_column(String(40))
    subject: Mapped[str] = mapped_column(String(40))
    version: Mapped[int]
    pool: Mapped[str] = mapped_column(String(12))
    review_state: Mapped[str] = mapped_column(String(12))
    fingerprint: Mapped[str] = mapped_column(String(64))
    concept: Mapped[str] = mapped_column(String(50))
    difficulty: Mapped[int]
    points: Mapped[int]
    kind: Mapped[str] = mapped_column(String(12))
    prompt: Mapped[str] = mapped_column(String)
    choices: Mapped[list[dict]] = mapped_column(JSONB)
    answer: Mapped[dict] = mapped_column(JSONB)
    explanation: Mapped[str] = mapped_column(String)
    source: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    fill_key: Mapped[str | None] = mapped_column(String(64), ForeignKey("exam_question_fills.key"))
    reviewed_by: Mapped[str | None] = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ExamBlueprint(Base):
    __tablename__ = "exam_blueprints"
    __table_args__ = (
        CheckConstraint("version > 0 AND duration_seconds > 0", name="ck_exam_blueprints_scale"),
        CheckConstraint("language IN ('fr', 'en', 'ar')", name="ck_exam_blueprints_language"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    topic: Mapped[str] = mapped_column(String(40))
    language: Mapped[str] = mapped_column(String(2))
    grade: Mapped[str] = mapped_column(String(40))
    section: Mapped[str] = mapped_column(String(40))
    subject: Mapped[str] = mapped_column(String(40))
    version: Mapped[int]
    duration_seconds: Mapped[int]
    slots: Mapped[list[dict]] = mapped_column(JSONB)
