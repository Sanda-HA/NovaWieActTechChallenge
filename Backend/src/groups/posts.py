from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from .models import RoomPost

MAX_POSTS = 50


def _view(post: RoomPost) -> dict:
    return {
        "id": str(post.id), "kind": post.kind, "text": post.text, "author": post.author,
        "verdict": post.verdict, "created_at": post.created_at,
        "session_id": post.session_id, "author_id": post.author_id, "format": post.explanation_format,
    }


def add(db, room_id: UUID, kind: str, text: str, author: str | None, verdict: str | None,
        author_id: UUID | None = None, session_id: int | None = None, *, ai_text_eligible: bool = False,
        explanation_format: str | None = None) -> dict:
    post = RoomPost(
        room_id=room_id, kind=kind, text=text, author=author, verdict=verdict,
        author_id=author_id, session_id=session_id, created_at=datetime.now(UTC),
        ai_text_eligible=ai_text_eligible, explanation_format=explanation_format,
    )
    db.add(post)
    db.flush()
    return _view(post)


def newest_first(db, room_id: UUID, before: int | None = None, *, include_session: bool = True) -> list[dict]:
    query = select(RoomPost).where(RoomPost.room_id == room_id)
    if not include_session:
        query = query.where(RoomPost.session_id.is_(None), RoomPost.kind.in_(("question", "explanation")))
    if before is not None:
        query = query.where(RoomPost.id < before)
    rows = db.scalars(query.order_by(RoomPost.id.desc()).limit(MAX_POSTS)).all()
    return [_view(p) for p in rows]


def open_points(db, session_id: int, user_id: UUID) -> list[RoomPost]:
    query = select(RoomPost).where(
        RoomPost.session_id == session_id,
        RoomPost.author_id == user_id,
        RoomPost.kind == "explanation",
        RoomPost.verdict.is_distinct_from("correct"),
    )
    return list(db.scalars(query.order_by(RoomPost.id.desc()).limit(MAX_POSTS)))
