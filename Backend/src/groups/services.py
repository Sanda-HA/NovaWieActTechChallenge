import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert

from ..auth.models import User
from . import room_sessions
from .access import can_join_session, require_group_pro
from .models import RoomMember, StudyRoom
from .room_tutor_context import raw_text_allowed
from .schemas import RoomConsentOut, RoomOut

# A member counts as present while their client keeps polling the room; it polls every few seconds.
PRESENCE = timedelta(seconds=45)
SEEN_WRITE_INTERVAL = timedelta(seconds=10)
MAX_MEMBERS = 8


def lock_membership_actor(db, user_id) -> None:
    key = f"ednova:room-membership:{user_id}"
    db.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(key, 0))))
    if db.scalar(select(User.id).where(User.id == user_id)) is None:
        raise HTTPException(404, detail={"error": "account_not_found"})


def member_room(db, user_id, room_id, *, lock=False):
    query = select(StudyRoom).join(RoomMember).where(StudyRoom.id == room_id, RoomMember.user_id == user_id)
    if lock:
        query = query.with_for_update(of=StudyRoom).execution_options(populate_existing=True)
    room = db.scalar(query)
    # A member may have been removed while this transaction was waiting for the room lock.
    if room is None or (lock and db.get(RoomMember, (room_id, user_id), populate_existing=True) is None):
        raise HTTPException(404, detail={"error": "room_not_found"})
    return room


def owner_room(db, user_id, room_id, *, lock=False):
    room = member_room(db, user_id, room_id, lock=lock)
    if room.owner_id != user_id:
        raise HTTPException(403, detail={"error": "not_room_owner"})
    return room


def mark_seen(db, user_id, room_id, now=None):
    now = now or datetime.now(UTC)
    db.execute(
        update(RoomMember)
        .where(RoomMember.room_id == room_id, RoomMember.user_id == user_id)
        .where((RoomMember.last_seen.is_(None)) | (RoomMember.last_seen < now - SEEN_WRITE_INTERVAL))
        .values(last_seen=now)
    )
    db.commit()


def room_view(db, user_id, room, already_member=False, now=None):
    now = now or datetime.now(UTC)
    rows = db.execute(
        select(User.id, User.pseudo, RoomMember.last_seen)
        .join(RoomMember).where(RoomMember.room_id == room.id).order_by(User.pseudo)
    ).all()
    pro = can_join_session(db, user_id, room)
    session = room_sessions.current(db, room.id) if pro else None
    return RoomOut(
        id=room.id, name=room.name, owner=room.owner_id == user_id,
        owner_pseudo=next((pseudo for uid, pseudo, _ in rows if uid == room.owner_id), ""),
        members=[pseudo for _, pseudo, _ in rows],
        active_members=[pseudo for _, pseudo, seen in rows if seen is not None and now - seen <= PRESENCE],
        invite_code=room.invite_code,
        session_round=session.round if session is not None else None,
        tutor_enabled=pro and room.tutor_enabled, tutor_version=room.tutor_version if pro else 0,
        tutor_round_prompts=pro and room.tutor_round_prompts,
        already_member=already_member,
    )


def list_rooms(db, user_id):
    rooms = db.scalars(
        select(StudyRoom).join(RoomMember).where(RoomMember.user_id == user_id).order_by(StudyRoom.name, StudyRoom.id)
    ).all()
    return [room_view(db, user_id, room) for room in rooms]


CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_ATTEMPTS = 5


def new_invite_code():
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


def _assign_code(db, room):
    for _ in range(CODE_ATTEMPTS):
        try:
            with db.begin_nested():
                room.invite_code = new_invite_code()
                db.add(room)
                db.flush()
            return
        except IntegrityError:
            continue
    raise HTTPException(503, detail={"error": "invite_code_unavailable"})


def create_room(db, user_id, name):
    lock_membership_actor(db, user_id)
    room = StudyRoom(owner_id=user_id, name=name)
    _assign_code(db, room)
    db.add(RoomMember(room_id=room.id, user_id=user_id, last_seen=datetime.now(UTC)))
    db.commit()
    return room_view(db, user_id, room)


def join_room(db, user_id, code):
    lock_membership_actor(db, user_id)
    # Exclusive lock: concurrent joins queue here, so the member count below stays accurate.
    room = db.scalar(select(StudyRoom).where(StudyRoom.invite_code == code).with_for_update())
    if room is None:
        raise HTTPException(404, detail={"error": "invite_not_found"})
    already_member = db.get(RoomMember, (room.id, user_id)) is not None
    if not already_member:
        count = db.scalar(select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room.id))
        if count >= MAX_MEMBERS:
            db.rollback()
            raise HTTPException(409, detail={"error": "room_full"})
    db.execute(
        insert(RoomMember).values(room_id=room.id, user_id=user_id, last_seen=datetime.now(UTC))
        .on_conflict_do_nothing(index_elements=[RoomMember.room_id, RoomMember.user_id])
    )
    db.commit()
    return room_view(db, user_id, room, already_member=already_member)


def leave_room(db, user_id, room_id):
    from . import duel_services, room_tutor

    room = member_room(db, user_id, room_id, lock=True)
    duel_services.cancel_for_member(db, room_id, user_id)
    if room.owner_id == user_id:
        db.delete(room)
        version = None
    else:
        _remove_membership(db, room, user_id)
        version = room.tutor_version
    db.commit()
    room_tutor.cancel_local(room_id, before_version=version)


def member_id(db, room_id, pseudo):
    user_id = db.scalar(
        select(User.id).join(RoomMember).where(RoomMember.room_id == room_id, User.pseudo == pseudo)
    )
    if user_id is None:
        raise HTTPException(404, detail={"error": "member_not_found"})
    return user_id


def remove_member(db, user_id, room_id, pseudo):
    from . import duel_services, room_tutor

    room = owner_room(db, user_id, room_id, lock=True)
    target = member_id(db, room_id, pseudo)
    if target == room.owner_id:
        raise HTTPException(409, detail={"error": "cannot_remove_owner"})
    duel_services.cancel_for_member(db, room_id, target)
    _remove_membership(db, room, target)
    version = room.tutor_version
    # The removed member still knows the old code.
    _assign_code(db, room)
    db.commit()
    room_tutor.cancel_local(room_id, before_version=version)
    return room_view(db, user_id, room)


def transfer_owner(db, user_id, room_id, pseudo):
    room = owner_room(db, user_id, room_id, lock=True)
    room.owner_id = member_id(db, room_id, pseudo)
    db.commit()
    return room_view(db, user_id, room)


def _remove_membership(db, room, user_id):
    from . import group_memory, room_tutor

    group_memory.withdraw(db, room.id, user_id, personal=True, shared=True)
    db.delete(db.get(RoomMember, (room.id, user_id)))
    room_tutor.invalidate(db, room)
    room_tutor.purge_contextual(db, room.id)


def update_settings(db, user_id, room_id, patch):
    from . import room_tutor

    room = owner_room(db, user_id, room_id, lock=True)
    require_group_pro(db, user_id)
    updates = {key: value for key, value in patch.model_dump(exclude_none=True).items() if getattr(room, key) != value}
    for key, value in updates.items():
        setattr(room, key, value)
    if updates:
        room_tutor.invalidate(db, room)
    version = room.tutor_version
    db.commit()
    if updates:
        room_tutor.cancel_local(room_id, before_version=version)
    return room_view(db, user_id, room)


def update_consent(db, user_id, room_id, patch):
    from . import room_tutor

    room = member_room(db, user_id, room_id, lock=True)
    member = db.get(RoomMember, (room_id, user_id))
    requested = patch.model_dump(exclude_none=True)
    if any(requested.values()):
        require_group_pro(db, user_id)
    updates = {key: value for key, value in requested.items() if getattr(member, key) != value}
    for key, value in updates.items():
        setattr(member, key, value)
    if "allow_ai_text" in updates:
        member.ai_text_consented_at = datetime.now(UTC) if member.allow_ai_text else None
    withdrawn = {key for key, value in updates.items() if not value}
    personal = "allow_personalization" in withdrawn
    shared = "allow_group_insights" in withdrawn
    if personal or shared:
        from . import group_memory

        group_memory.withdraw(db, room_id, user_id, personal=personal, shared=shared)
    if withdrawn:
        room_tutor.invalidate(db, room)
        room_tutor.purge_contextual(db, room_id)
    version = room.tutor_version
    db.commit()
    if withdrawn:
        room_tutor.cancel_local(room_id, before_version=version)
    return _consent_view(member)


def _consent_view(member) -> RoomConsentOut:
    return RoomConsentOut.model_validate({
        "allow_ai_text": member.allow_ai_text,
        "allow_solo_context": member.allow_solo_context,
        "allow_personalization": member.allow_personalization,
        "allow_group_insights": member.allow_group_insights,
        "raw_text_allowed": raw_text_allowed(),
    })


def read_consent(db, user_id, room_id):
    member = db.get(RoomMember, (room_id, user_id))
    if member is None:
        raise HTTPException(404, detail={"error": "room_not_found"})
    return _consent_view(member)
