from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..Database.core import Base


ACTIVE_STATUSES = ("invited", "lobby", "scheduled")


class Duel(Base):
    __tablename__ = "duels"
    __table_args__ = (
        CheckConstraint(
            "status IN ('invited', 'lobby', 'scheduled', 'finished', 'expired', 'cancelled')",
            name="ck_duels_status",
        ),
        Index(
            "uq_duels_open_room", "room_id", unique=True,
            postgresql_where=text("status IN ('invited', 'lobby', 'scheduled')"),
        ),
        UniqueConstraint("room_id", "invite_digest", name="uq_duels_code"),
        Index("ix_duels_deadline", "due_at", postgresql_where=text("terminal_at IS NULL")),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("room_sessions.id", ondelete="SET NULL"))
    creator_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    invitee_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    invite_digest: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(12))
    version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    invite_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terminal_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    result: Mapped[dict | None] = mapped_column(JSONB, deferred=True)


class DuelExam(Base):
    __tablename__ = "duel_exams"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    duel_id: Mapped[UUID] = mapped_column(ForeignKey("duels.id", ondelete="CASCADE"), unique=True)
    blueprint_id: Mapped[str] = mapped_column(String(80))
    topic: Mapped[str] = mapped_column(String(40))
    language: Mapped[str] = mapped_column(String(2))
    duration_seconds: Mapped[int]
    snapshot: Mapped[dict] = mapped_column(JSONB, deferred=True)


class DuelAttempt(Base):
    """A participant's seat and answer state share the same lifetime."""

    __tablename__ = "duel_attempts"
    __table_args__ = (
        UniqueConstraint("duel_id", "slot", name="uq_duel_attempt_slot"),
        UniqueConstraint("duel_id", "user_id", name="uq_duel_attempt_user"),
        CheckConstraint("slot IN (1, 2)", name="ck_duel_attempt_slot"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    duel_id: Mapped[UUID] = mapped_column(ForeignKey("duels.id", ondelete="CASCADE"))
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    slot: Mapped[int]
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lock_reason: Mapped[str | None] = mapped_column(String(12))
    revision: Mapped[int] = mapped_column(default=0)
    answered_count: Mapped[int] = mapped_column(default=0)
    answers: Mapped[dict] = mapped_column(JSONB, default=dict, deferred=True)
    grades: Mapped[dict] = mapped_column(JSONB, default=dict, deferred=True)


class DuelMutation(Base):
    __tablename__ = "duel_mutations"

    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    duel_id: Mapped[UUID] = mapped_column(ForeignKey("duels.id", ondelete="CASCADE"), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict] = mapped_column(JSONB)


class DuelCodeAttempts(Base):
    __tablename__ = "duel_code_attempts"

    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    count: Mapped[int]
