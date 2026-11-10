from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..Database.core import Base


class StudyRoom(Base):
    __tablename__ = "study_rooms"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    invite_code: Mapped[UUID] = mapped_column(unique=True, default=uuid4)


class RoomMember(Base):
    __tablename__ = "study_room_members"

    room_id: Mapped[UUID] = mapped_column(ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
