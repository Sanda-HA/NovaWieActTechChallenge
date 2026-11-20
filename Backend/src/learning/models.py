import uuid
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, Float, String, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import JSONB   # importe le type PostgreSQL JSONB pour créer une colonne capable de stocker du JSON de façon optimisée.
from sqlalchemy.orm import Mapped, mapped_column
from ..Database.core import Base
from ..student_plans import StudentPlan


class LearnerProfile(Base):
    __tablename__= "learner_profiles"
    __table_args__ = (
        CheckConstraint("student_plan IN ('free', 'pro')", name="ck_learner_profiles_student_plan"),
    )

    pro_requested: Mapped[bool] = mapped_column(server_default=text("false"))
    student_plan: Mapped[StudentPlan] = mapped_column(String(4), server_default="free")
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    level: Mapped[str] = mapped_column(String(20), default="beginner")
    subjects: Mapped[list] = mapped_column(JSONB, default=list)
    preferred_format: Mapped[str] = mapped_column(String(20), default="examples")
    diagnostic_score: Mapped[int | None] = mapped_column(default=None)
    city: Mapped[str | None] = mapped_column(String(50), default=None)
    grade: Mapped[str] = mapped_column(String(40), default="4eme_annee_secondaire")
    section: Mapped[str] = mapped_column(String(40), default="mathematiques")
    subject: Mapped[str] = mapped_column(String(40), default="math")
    reply_language: Mapped[str] = mapped_column(String(2), default="fr")
    presentation: Mapped[str | None] = mapped_column(String(10), default=None)
    enabled_tools: Mapped[list[str]] = mapped_column(
        JSONB, server_default=text("""'["guided", "feynman"]'::jsonb"""),
    )


class LearningQuiz(Base):
    __tablename__ = "learning_quizzes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quiz: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)


class MindMap(Base):
    __tablename__ = "mind_maps"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", name="fk_mind_maps_user"), primary_key=True,
    )
    grade: Mapped[str] = mapped_column(String(40), primary_key=True)
    section: Mapped[str] = mapped_column(String(40), primary_key=True)
    subject: Mapped[str] = mapped_column(String(40), primary_key=True)
    topic: Mapped[str] = mapped_column(String(40), primary_key=True)
    reply_language: Mapped[str] = mapped_column(String(2), primary_key=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source_revision: Mapped[int]
    schema_version: Mapped[int]
    artifact: Mapped[dict] = mapped_column(JSONB)
