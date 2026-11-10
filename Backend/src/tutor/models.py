import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from ..Database.core import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    # UUID: also used as the agent's session_id, so it must be unique across all users.
    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str | None] = mapped_column(String(200), default=None)  # last topic seen by the agent
    subject: Mapped[str | None] = mapped_column(String(40), default=None)
    turn_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ChatTurn(Base):
    """Metadata only: the student's message and the answer text are never stored (privacy rule)."""
    __tablename__ = "chat_turns"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    response_id: Mapped[str] = mapped_column(String(64), index=True)
    badge: Mapped[str | None] = mapped_column(String(40), default=None)
    topic: Mapped[str | None] = mapped_column(String(200), default=None)
    latency_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
