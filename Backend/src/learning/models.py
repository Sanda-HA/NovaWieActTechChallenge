import uuid
from sqlalchemy import String, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB   # importe le type PostgreSQL JSONB pour créer une colonne capable de stocker du JSON de façon optimisée.
from sqlalchemy.orm import Mapped, mapped_column
from ..Database.core import Base


class LearnerProfile(Base):
    __tablename__= "learner_profiles"
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
