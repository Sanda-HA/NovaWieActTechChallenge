from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Path, Query
from sqlalchemy import select

from ..ai.interface import Agent
from ..auth.services import CurrentUser
from ..contracts import PeerResult
from ..Database.core import DbSession
from ..learning import quizzes
from ..learning.models import LearnerProfile
from ..learning.services import get_or_create_profile, student_plan_for
from ..student_plans import require_pro
from ..utils import learner_pseudonym
from . import posts, room_check, room_sessions, room_tutor, room_tutor_context, services
from .access import can_join_session, require_group_pro, require_session_participation
from .models import RoomMember
from .room_tutor_context import raw_text_allowed
from .schemas import (
    GroupCheckIn,
    OwnerTransfer,
    RoomConsentOut,
    RoomConsentPatch,
    RoomCreate,
    RoomJoin,
    RoomOut,
    RoomPostIn,
    RoomPostOut,
    RoomQuizOut,
    RoomSettingsPatch,
    SessionOut,
    SessionStart,
    TutorRequestIn,
    TutorRequestOut,
)

router = APIRouter(prefix="/groups", tags=["groups"])

RoomId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,64}$")]
Pseudo = Annotated[str, Path(pattern=r"^[A-Za-z0-9]{3,30}$")]
IdempotencyKey = Annotated[str | None, Header(pattern=r"^[!-~]{1,128}$")]


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
    room = services.member_room(db, user.id, room_id)
    services.mark_seen(db, user.id, room_id)
    return services.room_view(db, user.id, room)


@router.delete("/rooms/{room_id}", status_code=204)
def leave_room(room_id: UUID, user: CurrentUser, db: DbSession):
    services.leave_room(db, user.id, room_id)


@router.patch("/rooms/{room_id}/settings", response_model=RoomOut)
def update_settings(room_id: UUID, data: RoomSettingsPatch, user: CurrentUser, db: DbSession):
    return services.update_settings(db, user.id, room_id, data)


@router.patch("/rooms/{room_id}/consent", response_model=RoomConsentOut)
def update_consent(room_id: UUID, data: RoomConsentPatch, user: CurrentUser, db: DbSession):
    return services.update_consent(db, user.id, room_id, data)


@router.get("/rooms/{room_id}/consent", response_model=RoomConsentOut)
def read_consent(room_id: UUID, user: CurrentUser, db: DbSession):
    return services.read_consent(db, user.id, room_id)


def _language(db, user_id: UUID) -> str:
    return db.scalar(select(LearnerProfile.reply_language).where(LearnerProfile.user_id == user_id)) or "fr"


async def _local_check(db, user, room_id: UUID, explanation: str, agent) -> dict:
    user_id = user.id
    room = services.member_room(db, user_id, room_id, lock=True)
    plan = student_plan_for(db, user_id)
    if room_sessions.active(db, room_id):
        require_session_participation(db, user_id, room)
    room_tutor.require_no_duel(db, room_id)
    language = _language(db, user_id)
    member = db.get(RoomMember, (room_id, user_id))
    reason = room_check.unavailable_reason(plan, member.allow_ai_text)
    if reason is not None:
        return room_check.checklist_result(language, reason)
    profile = get_or_create_profile(db, user)
    payload = {
        "room_id": room_tutor_context.room_key(room_id),
        "learner_id": learner_pseudonym(user_id),
        "explanation": explanation,
        "reply_language": profile.reply_language,
        "grade": profile.grade,
        "section": profile.section,
        "subject": profile.subject,
    }
    db.commit()  # release the room lock before waiting on the model
    return await room_check.evaluate(agent, payload, language)


@router.post("/rooms/{room_id}/check", response_model=PeerResult, response_model_exclude_unset=True)
async def check_in_room(room_id: UUID, data: GroupCheckIn, user: CurrentUser, db: DbSession, agent: Agent):
    return await _local_check(db, user, room_id, data.explanation, agent)


@router.delete("/rooms/{room_id}/members/{pseudo}", response_model=RoomOut)
def remove_member(room_id: UUID, pseudo: Pseudo, user: CurrentUser, db: DbSession):
    return services.remove_member(db, user.id, room_id, pseudo)


@router.post("/rooms/{room_id}/owner", response_model=RoomOut)
def transfer_owner(room_id: UUID, data: OwnerTransfer, user: CurrentUser, db: DbSession):
    return services.transfer_owner(db, user.id, room_id, data.pseudo)


@router.get("/rooms/{room_id}/posts", response_model=list[RoomPostOut])
def list_posts(
    room_id: UUID, user: CurrentUser, db: DbSession, before: Annotated[int | None, Query(gt=0)] = None
):
    room = services.member_room(db, user.id, room_id)
    return posts.newest_first(db, room_id, before, include_session=can_join_session(db, user.id, room))


@router.post("/rooms/{room_id}/posts", response_model=RoomPostOut, status_code=201)
def create_post(room_id: UUID, data: RoomPostIn, user: CurrentUser, db: DbSession):
    room = services.member_room(db, user.id, room_id, lock=True)
    member = db.get(RoomMember, (room_id, user.id))
    session = room_sessions.active(db, room_id) if can_join_session(db, user.id, room) else None
    author = user.pseudo if data.kind == "explanation" else None
    post = posts.add(
        db, room_id, data.kind, data.text, author, None, author_id=user.id,
        session_id=session.id if session else None, explanation_format=data.format,
        ai_text_eligible=bool(session and room.tutor_enabled and member.allow_ai_text and raw_text_allowed()),
    )
    if session:
        from . import group_memory

        group_memory.record_post(db, room_id, session, user.id, data.kind, concept=session.topic)
    db.commit()
    return post


@router.post(
    "/{room_id}/check",
    response_model=PeerResult,
    response_model_exclude_unset=True,
    summary="Check an explanation",
    description="Checks a study room explanation locally. A legacy non-UUID identifier requests "
                "feedback on the caller's standalone submission.",
)
async def check_explanation(room_id: RoomId, data: GroupCheckIn, user: CurrentUser, db: DbSession, agent: Agent):
    try:
        actual_room_id = UUID(room_id)
    except ValueError:
        actual_room_id = None
    if actual_room_id is not None:
        return await _local_check(db, user, actual_room_id, data.explanation, agent)
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


def _session_view(db, session, user_id: UUID) -> dict:
    action = room_sessions.review_action(_language(db, user_id))
    open_points = [
        {"id": str(p.id), "text": p.text, "verdict": p.verdict, "review_action": action}
        for p in posts.open_points(db, session.id, user_id)
    ]
    return {
        "session_id": session.id, "topic": session.topic, "goal": session.goal, "round": session.round,
        "notes": session.notes, "my_open_points": open_points,
    }


@router.post("/rooms/{room_id}/session", response_model=SessionOut, status_code=201)
def start_session(room_id: UUID, data: SessionStart, user: CurrentUser, db: DbSession):
    from ..learning.exam_bank import topic_label

    services.owner_room(db, user.id, room_id, lock=True)
    require_pro(student_plan_for(db, user.id), "host_session")
    if room_sessions.active(db, room_id):
        raise HTTPException(409, detail={"error": "session_active"})
    language = _language(db, user.id)
    label = topic_label(data.topic, language)
    session = room_sessions.start(db, room_id, data.topic, label, language)
    db.commit()
    return _session_view(db, session, user.id)


@router.post("/rooms/{room_id}/session/next", response_model=SessionOut)
def next_round(room_id: UUID, user: CurrentUser, db: DbSession):
    room = services.owner_room(db, user.id, room_id, lock=True)
    require_group_pro(db, user.id)
    session = room_sessions.open_session(db, room_id)
    if session.round == "quiz":
        room_sessions.end(session)
        room_tutor.queue_round_trigger(db, room, session, "session_summary")
    else:
        room_tutor.queue_round_trigger(db, room, session, "round_end")
        room_sessions.advance(session)
    db.commit()
    return _session_view(db, session, user.id)


@router.post("/rooms/{room_id}/session/end", response_model=SessionOut)
def end_session(room_id: UUID, user: CurrentUser, db: DbSession):
    room = services.owner_room(db, user.id, room_id, lock=True)
    require_group_pro(db, user.id)
    session = room_sessions.open_session(db, room_id)
    room_sessions.end(session)
    room_tutor.queue_round_trigger(db, room, session, "session_summary")
    db.commit()
    return _session_view(db, session, user.id)


@router.get("/rooms/{room_id}/session", response_model=SessionOut)
def read_session(room_id: UUID, user: CurrentUser, db: DbSession):
    room = services.member_room(db, user.id, room_id)
    require_session_participation(db, user.id, room)
    services.mark_seen(db, user.id, room_id)
    return _session_view(db, room_sessions.get(db, room_id), user.id)


@router.get("/rooms/{room_id}/session/quiz", response_model=RoomQuizOut)
def start_room_quiz(room_id: UUID, user: CurrentUser, db: DbSession):
    from ..learning.exam_bank import room_quiz_with_language

    room = services.member_room(db, user.id, room_id, lock=True)
    require_session_participation(db, user.id, room)
    room_tutor.require_no_duel(db, room_id)
    session = room_sessions.get(db, room_id)
    if session.round != "quiz":
        raise HTTPException(409, detail={"error": "quiz_round_inactive"})
    quiz, language = room_quiz_with_language(db, session.topic, _language(db, user.id), seed=session.id)
    return RoomQuizOut(**quizzes.issue(db, user.id, quiz, group_session=True).model_dump(), language=language)


@router.post("/rooms/{room_id}/session/tutor/requests", response_model=TutorRequestOut, status_code=202)
def create_tutor_request(
    room_id: UUID, data: TutorRequestIn, user: CurrentUser, db: DbSession, idempotency_key: IdempotencyKey = None,
):
    room = services.member_room(db, user.id, room_id, lock=True)
    require_session_participation(db, user.id, room)
    room_tutor.require_no_duel(db, room_id)
    job = room_tutor.request(db, room, user.id, _language(db, user.id), data, idempotency_key)
    db.commit()
    return job


@router.get("/rooms/{room_id}/session/tutor/requests/{request_id}", response_model=TutorRequestOut)
def read_tutor_request(room_id: UUID, request_id: UUID, user: CurrentUser, db: DbSession):
    room = services.member_room(db, user.id, room_id)
    require_session_participation(db, user.id, room)
    return room_tutor.read_request(db, room_id, request_id)
