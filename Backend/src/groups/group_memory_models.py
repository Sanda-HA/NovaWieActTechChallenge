from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from ..Database.core import Base


class GroupConceptEvidence(Base):
    __tablename__ = "group_concept_evidence"
    __table_args__ = (Index("ix_group_concept_lookup", "topic", "concept", "signal", "created_at"),)

    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    activity: Mapped[str] = mapped_column(String(50), primary_key=True)
    concept: Mapped[str] = mapped_column(String(40), primary_key=True)
    signal: Mapped[str] = mapped_column(String(16), primary_key=True)
    topic: Mapped[str] = mapped_column(String(40))
    explanation_format: Mapped[str | None] = mapped_column(String(12))
    count: Mapped[int]
    personal: Mapped[bool]
    shared: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
