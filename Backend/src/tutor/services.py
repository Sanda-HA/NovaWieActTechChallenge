import json
import time
from collections.abc import AsyncIterator
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, select, update
from ..ai.interface import AgentClient
from ..learning.services import get_or_create_profile
from ..utils import learner_pseudonym
from .models import ChatSession, ChatTurn
from .exceptions import SessionNotFound, ResponseNotFound
from .schemas import FeedbackIn, MessageIn
from ..contracts import ChatResult

PRESENTATION_STYLES = {"visual": "visual", "reading": "step_by_step"}

def answer_label(response: dict) -> dict:
    """Verbatim course excerpts are not generated answers (M12)."""
    generated = response.get("badge") != "course_excerpt"
    return {"ai_generated": generated, "label": "réponse générée par IA" if generated else "sans IA"}


def create_session(db, user, subject=None):
    s = ChatSession(user_id=user.id, subject=subject)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def list_sessions(db, user):
    return db.scalars(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc())
    ).all()


def get_owned_session(db, user, session_id):
    s = db.get(ChatSession, session_id)
    if not s or s.user_id != user.id:
        raise SessionNotFound()
    return s


def agent_payload(db, user, session, data: MessageIn) -> dict:
    profile = get_or_create_profile(db, user)
    payload = {
        "session_id": str(session.id),
        "learner_id": learner_pseudonym(user.id),
        "message": data.message,
        "mode": data.mode,
        "action": data.action,
        "grade": profile.grade,
        "section": profile.section,
        "subject": session.subject or profile.subject,
        "reply_language": profile.reply_language,
    }
    if session.subject is not None:
        payload["subject_selected"] = True
    if profile.presentation in PRESENTATION_STYLES:
        payload["preferred_style"] = PRESENTATION_STYLES[profile.presentation]
    return payload


def record_turn(db, session_id, response: dict, latency_ms: int):
    topic = response.get("topic")
    db.add(ChatTurn(
        session_id=session_id,
        response_id=response["response_id"],
        badge=response.get("badge"),
        topic=topic,
        latency_ms=latency_ms,
    ))
    db.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(turn_count=ChatSession.turn_count + 1, topic=func.coalesce(topic, ChatSession.topic))
    )
    db.commit()


async def send_message(db, agent: AgentClient, user, session, data: MessageIn) -> dict:
    payload = agent_payload(db, user, session, data)
    started = time.perf_counter()
    response = await agent.chat(payload)
    try:
        response = ChatResult.model_validate({**response, **answer_label(response)}).model_dump(exclude_unset=True)
    except ValidationError as exc:
        raise HTTPException(502, {"error": "agent_error"}) from exc
    record_turn(db, session.id, response, int((time.perf_counter() - started) * 1000))
    return response


async def stream_message(db, agent: AgentClient, user, session, data: MessageIn) -> AsyncIterator[str]:
    payload = agent_payload(db, user, session, data)
    session_id = session.id
    started = time.perf_counter()
    events = await agent.chat_events(payload)

    async def relay():
        async for kind, body in events:
            if kind == "result":
                try:
                    body = ChatResult.model_validate({**body, **answer_label(body)}).model_dump(exclude_unset=True)
                except ValidationError:
                    yield 'event: error\ndata: {"error": "agent_error"}\n\n'
                    return
                # FastAPI may already have closed the request's DB session (ORM objects detached);
                # the Session reopens on use and releases its connection again on commit.
                record_turn(db, session_id, body, int((time.perf_counter() - started) * 1000))
                body = {**body, **answer_label(body)}
            yield f"event: {kind}\ndata: {json.dumps(body, ensure_ascii=False)}\n\n"

    return relay()


async def send_feedback(db, agent: AgentClient, user, data: FeedbackIn) -> dict:
    owned = db.scalar(
        select(ChatTurn.id)
        .join(ChatSession, ChatTurn.session_id == ChatSession.id)
        .where(ChatTurn.response_id == data.response_id, ChatSession.user_id == user.id)
    )
    if owned is None:
        raise ResponseNotFound()
    return await agent.feedback(data.response_id, data.helpful, data.reason)
