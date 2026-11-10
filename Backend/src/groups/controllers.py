from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Path
from ..ai.interface import Agent
from ..auth.services import CurrentUser
from ..Database.core import DbSession
from ..learning.services import get_or_create_profile
from ..utils import learner_pseudonym
from ..contracts import PeerResult
from . import services
from .schemas import GroupCheckIn, RoomCreate, RoomJoin, RoomOut

router = APIRouter(prefix="/groups", tags=["groups"])

RoomId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,64}$")]


@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(user: CurrentUser, db: DbSession):
    return services.list_rooms(db, user.id)


@router.post("/rooms", response_model=RoomOut, status_code=201)
def create_room(data: RoomCreate, user: CurrentUser, db: DbSession):
    return services.create_room(db, user.id, data.name)


@router.post("/rooms/join", response_model=RoomOut)
def join_room(data: RoomJoin, user: CurrentUser, db: DbSession):
    return services.join_room(db, user.id, data.code)


@router.get("/rooms/{room_id}", response_model=RoomOut)
def read_room(room_id: UUID, user: CurrentUser, db: DbSession):
    return services.room_view(db, user.id, services.member_room(db, user.id, room_id))


@router.delete("/rooms/{room_id}", status_code=204)
def leave_room(room_id: UUID, user: CurrentUser, db: DbSession):
    services.leave_room(db, user.id, room_id)


@router.post("/rooms/{room_id}/check", response_model=PeerResult, response_model_exclude_unset=True)
async def check_in_room(room_id: UUID, data: GroupCheckIn, user: CurrentUser, db: DbSession, agent: Agent):
    services.member_room(db, user.id, room_id)
    return await check_explanation(str(room_id), data, user, db, agent)

@router.post(
    "/{room_id}/check",
    response_model=PeerResult,
    response_model_exclude_unset=True,
    summary="Check an explanation",
    description="Standalone check of the caller's submitted text. The legacy room_id is client context only; "
                "this route does not create rooms or access shared room content.",
)
async def check_explanation(room_id: RoomId, data: GroupCheckIn, user: CurrentUser, db: DbSession, agent: Agent):
    profile = get_or_create_profile(db, user)
    return await agent.group_check({
        "room_id": room_id,
        "learner_id": learner_pseudonym(user.id),
        "explanation": data.explanation,
        "reply_language": profile.reply_language,
        "grade": profile.grade,
        "section": profile.section,
        "subject": profile.subject,
    })
