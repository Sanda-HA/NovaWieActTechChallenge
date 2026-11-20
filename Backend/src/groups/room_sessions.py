from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select

from .models import RoomSession

ROUNDS = ("explain", "question", "quiz", "ended")

_REVIEW = {
    "fr": (
        "Énoncez le principe utilisé et ses conditions.",
        "Vérifiez l'explication avec un exemple ou un contre-exemple.",
        "Précisez l'étape qui reste à justifier.",
    ),
    "en": (
        "State the rule you used and its conditions.",
        "Check the explanation with an example or a counterexample.",
        "Identify the step that still needs justification.",
    ),
    "ar": (
        "اذكر القاعدة التي استعملتها وشروط تطبيقها.",
        "تحقّق من الشرح بمثال أو مثال مضاد.",
        "حدّد الخطوة التي لا تزال تحتاج إلى تبرير.",
    ),
}

_GUIDING_QUESTION = {
    "fr": "Quel exemple te permet de vérifier ton raisonnement ?",
    "en": "Which example helps you check your reasoning?",
    "ar": "ما المثال الذي يساعدك على التحقّق من استدلالك؟",
}


def current(db, room_id: UUID) -> RoomSession | None:
    query = select(RoomSession).where(RoomSession.room_id == room_id).order_by(RoomSession.id.desc()).limit(1)
    return db.scalar(query)


def get(db, room_id: UUID) -> RoomSession:
    session = current(db, room_id)
    if session is None:
        raise HTTPException(404, detail={"error": "no_session"})
    return session


def active(db, room_id: UUID) -> RoomSession | None:
    session = current(db, room_id)
    return session if session is not None and session.round != "ended" else None


def start(db, room_id: UUID, topic: str, label: str, lang: str) -> RoomSession:
    goals = {
        "fr": f"Objectif de révision : {label}.",
        "en": f"Study goal: understand {label.lower()}.",
        "ar": f"هدف المراجعة: فهم {label}.",
    }
    if topic == "derivabilite":
        goals["fr"] = "Comprendre la dérivabilité."
    session = RoomSession(
        room_id=room_id,
        topic=topic,
        goal=goals[lang],
        lang=lang,
        round=ROUNDS[0],
        started_at=datetime.now(UTC),
        notes=[],
    )
    db.add(session)
    db.flush()
    return session


def open_session(db, room_id: UUID) -> RoomSession:
    session = get(db, room_id)
    if session.round == "ended":
        raise HTTPException(409, detail={"error": "session_ended"})
    return session


def advance(session: RoomSession) -> None:
    session.round = ROUNDS[ROUNDS.index(session.round) + 1]


def end(session: RoomSession) -> None:
    session.round = "ended"
    session.ended_at = datetime.now(UTC)
    session.notes = list(_REVIEW[session.lang])


def checklist(language: str) -> dict:
    steps = list(_REVIEW[language])
    return {
        "verdict": "unknown",
        "checklist": steps,
        "missing_points": steps,
        "guiding_question": _GUIDING_QUESTION[language],
    }


def review_action(language: str) -> str:
    return _REVIEW[language][-1]
