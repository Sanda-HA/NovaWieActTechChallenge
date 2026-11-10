from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from ..auth.models import User
from .models import RoomMember, StudyRoom
from .schemas import RoomOut


def member_room(db, user_id, room_id):
    room = db.scalar(
        select(StudyRoom)
        .join(RoomMember)
        .where(StudyRoom.id == room_id, RoomMember.user_id == user_id)
    )
    if room is None:
        raise HTTPException(404, detail="room_not_found")
    return room


def room_view(db, user_id, room):
    owner = room.owner_id == user_id
    members = db.scalars(
        select(User.pseudo).join(RoomMember).where(RoomMember.room_id == room.id).order_by(User.pseudo)
    ).all()
    return RoomOut(
        id=room.id, name=room.name, owner=owner, members=list(members),
        invite_code=room.invite_code if owner else None,
    )


def list_rooms(db, user_id):
    rooms = db.scalars(
        select(StudyRoom).join(RoomMember).where(RoomMember.user_id == user_id).order_by(StudyRoom.name, StudyRoom.id)
    ).all()
    return [room_view(db, user_id, room) for room in rooms]


def create_room(db, user_id, name):
    room = StudyRoom(owner_id=user_id, name=name)
    db.add(room)
    db.flush()
    db.add(RoomMember(room_id=room.id, user_id=user_id))
    db.commit()
    return room_view(db, user_id, room)


def join_room(db, user_id, code):
    room = db.scalar(select(StudyRoom).where(StudyRoom.invite_code == code).with_for_update(read=True, key_share=True))
    if room is None:
        raise HTTPException(404, detail="invite_not_found")
    db.execute(
        insert(RoomMember).values(room_id=room.id, user_id=user_id)
        .on_conflict_do_nothing(index_elements=[RoomMember.room_id, RoomMember.user_id])
    )
    result = room_view(db, user_id, room)
    db.commit()
    return result


def leave_room(db, user_id, room_id):
    room = member_room(db, user_id, room_id)
    if room.owner_id == user_id:
        db.delete(room)
    else:
        member = db.get(RoomMember, (room_id, user_id))
        if member is not None:
            db.delete(member)
    db.commit()
