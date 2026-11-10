from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

class GroupCheckIn(BaseModel):
    explanation: str = Field(min_length=1, max_length=2000)


class RoomCreate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class RoomJoin(BaseModel):
    code: UUID


class RoomOut(BaseModel):
    id: UUID
    name: str
    owner: bool
    members: list[str]
    invite_code: UUID | None
