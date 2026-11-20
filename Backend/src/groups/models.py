from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, false, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..Database.core import Base


class StudyRoom(Base):
    __tablename__ = "study_rooms"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    invite_code: Mapped[str] = mapped_column(String(6), unique=True)
    tutor_enabled: Mapped[bool] = mapped_column(server_default=text("false"))
    tutor_version: Mapped[int] = mapped_column(server_default=text("0"))
    tutor_round_prompts: Mapped[bool] = mapped_column(server_default=text("false"))


class RoomMember(Base):
    __tablename__ = "study_room_members"

    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    allow_ai_text: Mapped[bool] = mapped_column(server_default=text("false"))
    allow_solo_context: Mapped[bool] = mapped_column(server_default=text("false"))
    allow_personalization: Mapped[bool] = mapped_column(server_default=text("false"))
    allow_group_insights: Mapped[bool] = mapped_column(server_default=text("false"))
    ai_text_consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RoomSession(Base):
    __tablename__ = "room_sessions"
    __table_args__ = (
        # one running group session per room, even under concurrent starts
        Index("uq_room_sessions_running", "room_id", unique=True, postgresql_where=text("round <> 'ended'")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str] = mapped_column(String(40))
    goal: Mapped[str] = mapped_column(String(300))
    lang: Mapped[str] = mapped_column(String(2))
    round: Mapped[str] = mapped_column(String(10))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[list] = mapped_column(JSONB, default=list)
    tutor_routine_count: Mapped[int] = mapped_column(server_default=text("0"))
    last_active: Mapped[dict] = mapped_column(JSONB, default=dict)
    prompted: Mapped[dict] = mapped_column(JSONB, default=dict)


class RoomPost(Base):
    __tablename__ = "room_posts"
    __table_args__ = (
        CheckConstraint(
            "explanation_format IS NULL OR explanation_format IN ('step_by_step', 'examples', 'visual', 'analogy')",
            name="ck_room_posts_explanation_format",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("room_sessions.id", ondelete="SET NULL"), default=None)
    # Kept for every post, anonymous questions included, so deleting an account deletes its posts.
    # Never returned to other members.
    author_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))
    text: Mapped[str] = mapped_column(String(1000))
    author: Mapped[str | None] = mapped_column(String(64))
    verdict: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ai_text_eligible: Mapped[bool] = mapped_column(server_default=false())
    explanation_format: Mapped[str | None] = mapped_column(String(12))


class RoomTutorJob(Base):
    __tablename__ = "room_tutor_jobs"
    __table_args__ = (
        CheckConstraint("state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')", name="ck_room_tutor_state"),
        CheckConstraint(
            "kind IN ('explain', 'hint', 'round_end', 'session_summary', 'duel_debrief')", name="ck_room_tutor_kind"
        ),
        UniqueConstraint("room_id", "version", "source_key", name="uq_room_tutor_source"),
        UniqueConstraint("room_id", "version", "idempotency_key", name="uq_room_tutor_idempotency"),
        Index("uq_room_tutor_running", "room_id", unique=True, postgresql_where=text("state = 'running'")),
        Index("ix_room_tutor_dispatch", "state", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("room_sessions.id", ondelete="CASCADE"), index=True)
    duel_id: Mapped[UUID | None] = mapped_column(ForeignKey("duels.id", ondelete="CASCADE", name="fk_room_tutor_duel"), index=True)
    requester_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    source_post_id: Mapped[int | None] = mapped_column(ForeignKey("room_posts.id", ondelete="SET NULL"))
    source_key: Mapped[str | None] = mapped_column(String(120))
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    version: Mapped[int]
    kind: Mapped[str] = mapped_column(String(16))
    state: Mapped[str] = mapped_column(String(10), default="queued")
    topic: Mapped[str] = mapped_column(String(40))
    language: Mapped[str] = mapped_column(String(2))
    concepts: Mapped[list[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[UUID | None]
    payload_digest: Mapped[str | None] = mapped_column(String(64))
    retrieve_permitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    infer_permitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    used_private_context: Mapped[bool] = mapped_column(server_default=false())
    result_text: Mapped[str | None] = mapped_column(String(420))
    result_post_id: Mapped[int | None] = mapped_column(ForeignKey("room_posts.id", ondelete="SET NULL"))
