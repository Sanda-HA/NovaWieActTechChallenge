import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column
from ..Database.core import Base

class StudySession(Base):
    __tablename__ = "study_sessions"
    __table_args__ = (
        # at most one running session per user, even under concurrent /study/start calls
        Index("uq_study_sessions_open", "user_id", unique=True, postgresql_where=text("ended_at IS NULL")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
