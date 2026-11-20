from collections import Counter
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, distinct, func, select, update
from sqlalchemy.dialects.postgresql import insert

from .duel_models import Duel, DuelAttempt
from .group_memory_models import GroupConceptEvidence as Evidence
from .models import RoomMember, RoomPost, RoomSession, RoomTutorJob


EVIDENCE_TTL = timedelta(days=90)
REVISIT_WINDOW = timedelta(days=7)


def _record(db, room_id, user_id, activity, topic, counts, now, *, explanation_format=None):
    member = db.get(RoomMember, (room_id, user_id))
    if member is None or not (member.allow_personalization or member.allow_group_insights):
        return
    stmt = insert(Evidence).values([
        {
            "room_id": room_id, "user_id": user_id, "activity": activity, "topic": topic, "concept": concept,
            "signal": signal, "count": count, "created_at": now, "explanation_format": explanation_format,
            "personal": member.allow_personalization, "shared": member.allow_group_insights,
        }
        for (concept, signal), count in counts.items()
    ])
    db.execute(stmt.on_conflict_do_nothing())


def record_duel(db, room_id, duel_id, topic, items, attempt, now):
    counts = Counter()
    for item in items:
        concept = item["concept"]
        counts[concept, "covered"] += 1
        counts[concept, "correct" if attempt.grades[item["id"]] else "missed"] += 1
    _record(db, room_id, attempt.user_id, f"duel:{duel_id}", topic, counts, now)


def record_post(db, room_id, session, user_id, kind, *, concept):
    signal = "question_asked" if kind == "question" else "covered"
    _record(db, room_id, user_id, f"session:{session.id}", session.topic, {(concept, signal): 1}, datetime.now(UTC))


def record_helpfulness(db, room_id, session, post, user_id, helpful, explanation_format):
    activity = f"post:{post.id}"
    db.execute(delete(Evidence).where(
        Evidence.room_id == room_id, Evidence.user_id == user_id, Evidence.activity == activity,
    ))
    if helpful:
        _record(
            db, room_id, user_id, activity, session.topic, {(session.topic, "helpful"): 1}, datetime.now(UTC),
            explanation_format=explanation_format,
        )


def withdraw(db, room_id, user_id, *, personal=False, shared=False):
    changes = {}
    if personal:
        changes["personal"] = False
    if shared:
        changes["shared"] = False
    if changes:
        scope = (Evidence.room_id == room_id, Evidence.user_id == user_id)
        db.execute(update(Evidence).where(*scope).values(**changes))
        db.execute(delete(Evidence).where(*scope, Evidence.personal.is_(False), Evidence.shared.is_(False)))


def _common_misses(db, topic, now, room_id=None):
    query = select(Evidence.concept).where(
        Evidence.shared.is_(True), Evidence.topic == topic, Evidence.signal == "missed",
        Evidence.created_at >= now - EVIDENCE_TTL,
    ).group_by(Evidence.concept)
    if room_id is None:
        query = query.having(func.count(distinct(Evidence.user_id)) >= 5, func.count(distinct(Evidence.room_id)) >= 3)
    else:
        query = query.where(Evidence.room_id == room_id).having(func.count(distinct(Evidence.user_id)) >= 3)
    return set(db.scalars(query))


def cohort_review_concepts(db, topic, now=None):
    """Return concept IDs eligible for curriculum review, without contributors or counts."""
    return sorted(_common_misses(db, topic, now or datetime.now(UTC)))


def room_review_concepts(db, room_id, topic, now=None):
    return sorted(_common_misses(db, topic, now or datetime.now(UTC), room_id))


def room_insights(db, room_id, topic):
    now = datetime.now(UTC)
    shared = db.execute(
        select(Evidence.concept, Evidence.signal, Evidence.explanation_format)
        .where(
            Evidence.room_id == room_id, Evidence.topic == topic, Evidence.shared.is_(True),
            Evidence.created_at >= now - EVIDENCE_TTL,
        )
        .group_by(Evidence.concept, Evidence.signal, Evidence.explanation_format)
        .having(func.count(distinct(Evidence.user_id)) >= 3)
        .order_by(Evidence.concept, Evidence.explanation_format)
    ).all()
    return {
        "topic": topic,
        "review_concepts": [concept for concept, signal, _ in shared if signal == "missed"][:6],
        "asked_concepts": [concept for concept, signal, _ in shared if signal == "question_asked"][:6],
        "covered_concepts": [concept for concept, signal, _ in shared if signal == "covered"][:6],
        "helpful_formats": [
            {"concept": concept, "format": explanation_format}
            for concept, signal, explanation_format in shared if signal == "helpful" and explanation_format
        ][:6],
    }


def private_review(db, user_id, now=None):
    now = now or datetime.now(UTC)
    relevant = list(db.execute(
        select(Evidence.room_id, Evidence.topic, Evidence.concept, Evidence.signal, Evidence.created_at)
        .where(
            Evidence.user_id == user_id, Evidence.personal.is_(True),
            Evidence.signal.in_(("missed", "question_asked", "correct")), Evidence.created_at >= now - REVISIT_WINDOW,
        ).order_by(Evidence.created_at.desc(), Evidence.concept)
    ))
    room_misses = {}
    selected = {}
    resolved = set()
    missed_at = {(row.topic, row.concept, row.created_at) for row in relevant if row.signal == "missed"}
    for room_id, topic, concept, signal, created in relevant:
        key = (topic, concept)
        if key in selected or key in resolved:
            continue
        if signal == "correct":
            # Correct and missed can occur together on different questions in one attempt.
            if (topic, concept, created) not in missed_at:
                resolved.add(key)
            continue
        room_key = (room_id, topic)
        if room_key not in room_misses:
            # A learner gets a priority boost only for a concept they also encountered.
            room_misses[room_key] = _common_misses(db, topic, now, room_id)
        selected[key] = {
            "topic": topic, "concept": concept, "priority": 2 if concept in room_misses[room_key] else 1,
            "review_until": created + REVISIT_WINDOW,
        }
    return sorted(selected.values(), key=lambda r: (-r["priority"], -r["review_until"].timestamp()))[:10]


def expire(db, now=None):
    now = now or datetime.now(UTC)
    cutoff = now - timedelta(days=30)
    old_attempts = select(Duel.id).where(Duel.terminal_at < now - timedelta(days=7))
    db.execute(update(DuelAttempt).where(DuelAttempt.duel_id.in_(old_attempts), DuelAttempt.answers != {}).values(answers={}))
    db.execute(delete(Duel).where(Duel.terminal_at < cutoff))
    db.execute(delete(RoomTutorJob).where(RoomTutorJob.created_at < cutoff))
    db.execute(delete(RoomPost).where(RoomPost.created_at < cutoff))
    db.execute(update(RoomSession).where(
        RoomSession.round == "ended",
        func.coalesce(RoomSession.ended_at, RoomSession.started_at) < cutoff,
        RoomSession.notes != [],
    ).values(notes=[]))
    db.execute(delete(Evidence).where(Evidence.created_at < now - EVIDENCE_TTL))
    db.commit()
