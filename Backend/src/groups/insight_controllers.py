from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field

from ..auth.services import CurrentUser
from ..Database.core import DbSession
from . import group_memory, room_sessions, services
from .access import authorize_group_sessions
from .models import RoomPost


router = APIRouter(
    prefix="/groups/rooms/{room_id}/session", tags=["groups"], dependencies=[Depends(authorize_group_sessions)],
)
ExplanationFormat = Literal["step_by_step", "examples", "visual", "analogy"]


class HelpfulnessIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    helpful: bool = Field(strict=True)
    format: ExplanationFormat | None = None


class HelpfulFormat(BaseModel):
    concept: str
    format: ExplanationFormat


class RoomInsights(BaseModel):
    topic: str
    review_concepts: list[str]
    asked_concepts: list[str]
    covered_concepts: list[str]
    helpful_formats: list[HelpfulFormat]


@router.get("/insights", response_model=RoomInsights)
def read_insights(room_id: UUID, user: CurrentUser, db: DbSession):
    services.member_room(db, user.id, room_id)
    session = room_sessions.get(db, room_id)
    return group_memory.room_insights(db, room_id, session.topic)


@router.put("/posts/{post_id}/helpfulness", status_code=204)
def rate_explanation(
    room_id: UUID, post_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    data: HelpfulnessIn, user: CurrentUser, db: DbSession,
):
    services.member_room(db, user.id, room_id, lock=True)
    session = room_sessions.get(db, room_id)
    post = db.get(RoomPost, post_id)
    if post is None or post.room_id != room_id or post.session_id != session.id or post.kind not in ("explanation", "tutor_reply"):
        raise HTTPException(404, detail={"error": "explanation_not_found"})
    if post.author_id == user.id:
        raise HTTPException(409, detail={"error": "cannot_rate_own_explanation"})
    explanation_format = data.format or post.explanation_format
    if explanation_format is None:
        raise HTTPException(422, detail={"error": "format_required"})
    group_memory.record_helpfulness(db, room_id, session, post, user.id, data.helpful, explanation_format)
    db.commit()
