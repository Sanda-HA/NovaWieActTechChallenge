import hashlib
import hmac
import os
import re
from collections import Counter

from sqlalchemy import select

from ..auth.models import User
from ..config import settings
from ..learning.models import LearnerProfile
from .models import RoomMember, RoomPost

EXPLICIT = ("explain", "hint")
DEFAULT_STYLE = "step_by_step"  # llm_service applies this when the payload carries no style
_SUBTOPICS = {
    "derivabilite": ("derivative_rules", "differentiability_at_point", "tangent_equation", "chain_rule", "product_rule"),
    "probabilites": ("loi_binomiale", "denombrement", "probabilites_conditionnelles", "variables_aleatoires"),
}
_STYLES = {"steps": "step_by_step", "examples": "examples", "analogy": "analogy"}
_LEVELS = {"beginner": "fragile", "intermediate": "moyen", "advanced": "solide"}
_CONTACT = re.compile(
    r"(?<!\w)@\w+|\bwww\.|://|[\w.+-]+@[\w.-]+\.\w+|"
    r"(?<!\w)\+?\d(?:[ .()\-]*\d){8,}(?!\w)",
    re.IGNORECASE,
)


def raw_text_allowed() -> bool:
    return os.environ.get("ROOM_TUTOR_ALLOW_RAW_TEXT", "").strip().lower() in {"1", "true", "yes", "on"}


def agent_topic(topic: str) -> str:
    return next((parent for parent, children in _SUBTOPICS.items() if topic in children), topic)


def allowed_concepts(topic: str) -> set[str]:
    parent = agent_topic(topic)
    return {parent, *_SUBTOPICS.get(parent, ())}


def room_key(room_id) -> str:
    return hmac.new(settings.secret_key.encode(), f"room-tutor:{room_id}".encode(), hashlib.sha256).hexdigest()[:32]


def private_reference(db, room_id, value: str) -> bool:
    if _CONTACT.search(value):
        return True
    tokenized = set(re.findall(r"[a-z0-9]+", value.lower()))
    return any(
        pseudo.lower() in tokenized
        for pseudo in db.scalars(select(User.pseudo).join(RoomMember).where(RoomMember.room_id == room_id))
    )


def _raw_context(db, job) -> dict:
    eligible = (
        select(RoomPost.id, RoomPost.kind, RoomPost.text)
        .join(RoomMember, (RoomMember.room_id == RoomPost.room_id) & (RoomMember.user_id == RoomPost.author_id))
        .where(
            RoomPost.room_id == job.room_id,
            RoomPost.session_id == job.session_id,
            RoomPost.kind.in_(("explanation", "question")),
            RoomPost.created_at <= job.created_at,
            RoomPost.ai_text_eligible.is_(True),
            RoomMember.allow_ai_text.is_(True),
            RoomPost.created_at >= RoomMember.ai_text_consented_at,
        )
    )
    context = {}
    if job.source_post_id is not None:
        source = db.execute(eligible.where(RoomPost.id == job.source_post_id)).first()
        if source is not None and not private_reference(db, job.room_id, source.text):
            context["question"] = source.text
        eligible = eligible.where(RoomPost.id != job.source_post_id)
    recent = [
        row.text
        for row in db.execute(eligible.order_by(RoomPost.id.desc()).limit(5))
        if not private_reference(db, job.room_id, row.text)
    ]
    if recent:
        context["recent"] = recent
    return context


def _supported_bucket(votes: list[str | None]) -> str | None:
    for bucket, count in sorted(Counter(vote for vote in votes if vote is not None).items()):
        if count >= 3:
            return bucket
    return None


def _group_preferences(db, job) -> dict:
    contributors = (
        select(RoomPost.author_id)
        .where(
            RoomPost.room_id == job.room_id,
            RoomPost.session_id == job.session_id,
            RoomPost.created_at <= job.created_at,
            RoomPost.kind.in_(("explanation", "question")),
        )
        .distinct()
    )
    profiles = db.execute(
        select(LearnerProfile.presentation, LearnerProfile.preferred_format, LearnerProfile.level)
        .join(RoomMember, RoomMember.user_id == LearnerProfile.user_id)
        .where(
            RoomMember.room_id == job.room_id,
            RoomMember.allow_solo_context.is_(True),
            LearnerProfile.user_id.in_(contributors),
        )
    ).all()
    style = _supported_bucket([
        "visual" if presentation == "visual" else _STYLES.get(preferred_format)
        for presentation, preferred_format, _ in profiles
    ])
    level = _supported_bucket([_LEVELS.get(level) for _, _, level in profiles])
    return {key: value for key, value in {"style": style, "level": level}.items() if value is not None}


def tutor_payload(db, job, requester: RoomMember | None) -> dict:
    from .group_memory import room_review_concepts

    topic = agent_topic(job.topic)
    concepts = job.concepts
    if job.kind in (*EXPLICIT, "session_summary"):
        supported = allowed_concepts(topic)
        additions = [
            concept for concept in room_review_concepts(db, job.room_id, topic)
            if concept in supported and concept not in concepts
        ]
        concepts = [*concepts, *additions[:min(3, 8 - len(concepts))]]
    payload = {
        "kind": job.kind,
        "topic": topic,
        "reply_language": job.language,
        "room_key": room_key(job.room_id),
        "concepts": concepts,
    }
    if requester is not None and job.kind in EXPLICIT:
        payload.update(_group_preferences(db, job))
        if requester.allow_ai_text and raw_text_allowed():
            payload.update(_raw_context(db, job))
    return payload
