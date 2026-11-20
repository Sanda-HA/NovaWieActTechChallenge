import hmac
import json
import secrets
from datetime import timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, exists, func, or_, select

from ..auth.models import User
from ..config import settings
from ..learning import exam_bank
from ..learning.services import student_plan_for
from . import room_sessions, services
from .duel_models import ACTIVE_STATUSES, Duel, DuelAttempt, DuelCodeAttempts, DuelExam, DuelMutation
from .models import RoomMember, StudyRoom


INVITE_TTL = timedelta(minutes=5)
READY_TTL = timedelta(minutes=2)
START_DELAY = timedelta(seconds=5)


def server_now(db):
    return db.scalar(select(func.clock_timestamp()))


def problem(status, error, **detail):
    return HTTPException(status, detail={"error": error, **detail})


def _digest(purpose, value):
    return hmac.digest(settings.secret_key.encode(), f"{purpose}:{value}".encode(), "sha256")


def _code(duel_id):
    alphabet = services.CODE_ALPHABET
    return "".join(alphabet[part % len(alphabet)] for part in _digest("duel-invite", duel_id)[:8])


def _code_digest(code):
    return _digest("duel-code", code).hex()


def _attempts(db, duel_id):
    return list(db.scalars(select(DuelAttempt).where(DuelAttempt.duel_id == duel_id).order_by(DuelAttempt.slot)))


def exam_for(db, duel_id):
    return db.scalar(select(DuelExam).where(DuelExam.duel_id == duel_id))


def own_attempt(db, duel_id, user_id):
    attempt = db.scalar(select(DuelAttempt).where(DuelAttempt.duel_id == duel_id, DuelAttempt.user_id == user_id))
    if attempt is None:
        raise problem(404, "duel_not_found")
    return attempt


def _visible_to(user_id):
    seated = exists().where(DuelAttempt.duel_id == Duel.id, DuelAttempt.user_id == user_id)
    return or_(seated, Duel.invitee_id == user_id)


def _current_member(room_id, user_id):
    return exists().where(RoomMember.room_id == room_id, RoomMember.user_id == user_id)


def visible_duel(db, room_id, duel_id, user_id):
    duel = db.scalar(select(Duel).where(
        Duel.id == duel_id, Duel.room_id == room_id, _current_member(room_id, user_id), _visible_to(user_id),
    ))
    if duel is None:
        raise problem(404, "duel_not_found")
    return duel


def phase(duel, now):
    if duel.status in ("invited", "lobby") and now >= duel.due_at:
        return "expired"
    if duel.status == "scheduled":
        if now >= duel.deadline_at:
            return "grading"
        if now >= duel.starts_at:
            return "running"
    return duel.status


def view(db, duel, user_id, now):
    exam = exam_for(db, duel.id)
    players = db.execute(
        select(DuelAttempt, User.pseudo).outerjoin(User, DuelAttempt.user_id == User.id)
        .where(DuelAttempt.duel_id == duel.id).order_by(DuelAttempt.slot)
    ).all()
    return {
        "duel_id": duel.id, "blueprint_id": exam.blueprint_id, "topic": exam.topic, "language": exam.language,
        "status": phase(duel, now), "version": duel.version, "server_now": now,
        "invite_expires_at": duel.invite_expires_at,
        "ready_expires_at": duel.due_at if duel.status == "lobby" else None,
        "starts_at": duel.starts_at, "deadline_at": duel.deadline_at,
        "my_slot": next((row.slot for row, _ in players if row.user_id == user_id), None),
        "players": [
            {"slot": row.slot, "pseudo": pseudo, "ready": row.ready_at is not None,
             "answered_count": row.answered_count, "submission_state": row.lock_reason or "open"}
            for row, pseudo in players
        ],
    }


def list_for_member(db, room_id, user_id, status=None):
    now = server_now(db)
    duels = db.scalars(
        select(Duel).where(Duel.room_id == room_id, _current_member(room_id, user_id), _visible_to(user_id))
        .order_by(Duel.created_at.desc()).limit(50)
    )
    return [
        _creation_response(duel, view(db, duel, user_id, now), user_id, now)
        for duel in duels if status is None or phase(duel, now) == status
    ]


def view_with_invite(db, duel, user_id, now):
    return _creation_response(duel, view(db, duel, user_id, now), user_id, now)


def _creation_response(duel, response, user_id, now):
    if duel.creator_id == user_id and duel.invite_digest is not None and phase(duel, now) == "invited":
        code = _code(duel.id)
        if hmac.compare_digest(_code_digest(code), duel.invite_digest):
            return {**response, "invite_code": code}
    return response


def mutate(db, room_id, user_id, key, action, payload, perform):
    room = services.member_room(db, user_id, room_id, lock=True)
    now = server_now(db)
    fingerprint = _digest("duel-mutation", json.dumps([action, payload], sort_keys=True)).hex()
    receipt = db.get(DuelMutation, (room_id, user_id, key))
    if receipt is not None:
        duel = visible_duel(db, room_id, receipt.duel_id, user_id)
        if not hmac.compare_digest(receipt.fingerprint, fingerprint):
            raise problem(409, "idempotency_key_reused")
        response = receipt.response
    else:
        duel, body = perform(room, now)
        response = jsonable_encoder(body)
        db.add(DuelMutation(
            room_id=room_id, user_id=user_id, key=key, duel_id=duel.id, fingerprint=fingerprint, response=response,
        ))
        db.commit()
    return _creation_response(duel, response, user_id, now) if action == "create" else response


def _room_open_duel(db, room_id):
    return db.scalar(select(Duel).where(Duel.room_id == room_id, Duel.status.in_(ACTIVE_STATUSES)))


def _mark_terminal(duel, status, now, result=None):
    duel.status = status
    duel.terminal_at = now
    duel.result = result
    duel.version += 1


def _seal_exam(snapshot):
    """Give each exam its own public question and option identifiers."""
    original_tiebreak = snapshot["tiebreak_question_id"]
    for item in snapshot["items"]:
        item["bank_item_id"] = item["id"]
        item["id"] = uuid4().hex
        if item["bank_item_id"] == original_tiebreak:
            snapshot["tiebreak_question_id"] = item["id"]
        if item["kind"] == "choice":
            correct = item["answer"]["choice_id"]
            for choice in item["choices"]:
                original = choice["id"]
                choice["id"] = uuid4().hex
                if original == correct:
                    item["answer"] = {"choice_id": choice["id"]}
    return snapshot


def _require_pro_opponent(db, user_id):
    if user_id is None or student_plan_for(db, user_id) != "pro":
        raise problem(409, "duel_opponent_unavailable")


def create(db, room, creator_id, data, now):
    existing = _room_open_duel(db, room.id)
    if existing:
        if not settle_due(db, room, existing, now):
            raise problem(409, "duel_active")
        db.flush()
    invitee_id = services.member_id(db, room.id, data.opponent_pseudo) if data.opponent_pseudo else None
    if invitee_id == creator_id:
        raise problem(409, "cannot_invite_self")
    if invitee_id is not None:
        _require_pro_opponent(db, invitee_id)
    snapshot = _seal_exam(exam_bank.assemble_exam(db, data.blueprint_id, seed=secrets.randbits(64)))
    duel_id = uuid4()
    invite_digest = None
    if invitee_id is None:
        for _ in range(5):
            invite_digest = _code_digest(_code(duel_id))
            if not db.scalar(select(Duel.id).where(Duel.room_id == room.id, Duel.invite_digest == invite_digest)):
                break
            duel_id = uuid4()
        else:
            raise problem(503, "duel_code_unavailable")
    session = room_sessions.active(db, room.id)
    duel = Duel(
        id=duel_id, room_id=room.id, session_id=session.id if session else None,
        creator_id=creator_id, invitee_id=invitee_id, invite_digest=invite_digest, status="invited",
        created_at=now, invite_expires_at=now + INVITE_TTL, due_at=now + INVITE_TTL,
    )
    db.add(duel)
    db.flush()
    db.add_all([
        DuelExam(
            duel_id=duel.id, blueprint_id=data.blueprint_id, topic=snapshot["topic"], language=snapshot["language"],
            duration_seconds=snapshot["duration_seconds"], snapshot=snapshot,
        ),
        DuelAttempt(duel_id=duel.id, user_id=creator_id, slot=1),
    ])
    db.flush()
    return duel, view(db, duel, creator_id, now)


def _count_code_attempt(db, room_id, user_id, now):
    limit = db.get(DuelCodeAttempts, (room_id, user_id))
    if limit is None:
        db.add(DuelCodeAttempts(room_id=room_id, user_id=user_id, window_started_at=now, count=1))
    elif now - limit.window_started_at >= timedelta(minutes=1):
        limit.window_started_at, limit.count = now, 1
    elif limit.count >= 8:
        raise HTTPException(429, detail={"error": "duel_code_rate_limited"}, headers={"Retry-After": "60"})
    else:
        limit.count += 1


def join_by_code(db, room, user_id, code, now):
    _count_code_attempt(db, room.id, user_id, now)
    duel = db.scalar(select(Duel).where(Duel.room_id == room.id, Duel.invite_digest == _code_digest(code)))
    if duel is None or duel.invitee_id is not None:
        db.commit()
        raise problem(404, "duel_invite_not_found")
    try:
        return _accept(db, duel, user_id, now)
    except HTTPException:
        db.commit()
        raise


def accept_named(db, room, duel_id, user_id, now):
    duel = visible_duel(db, room.id, duel_id, user_id)
    if duel.invitee_id != user_id:
        raise problem(404, "duel_invite_not_found")
    return _accept(db, duel, user_id, now)


def _accept(db, duel, user_id, now):
    if phase(duel, now) == "expired":
        raise problem(410, "duel_invite_expired")
    if duel.creator_id == user_id:
        raise problem(409, "cannot_invite_self")
    if duel.status != "invited":
        raise problem(409, "duel_invite_closed")
    _require_pro_opponent(db, duel.creator_id)
    duel.invitee_id = user_id
    duel.status = "lobby"
    duel.due_at = now + READY_TTL
    duel.version += 1
    db.add(DuelAttempt(duel_id=duel.id, user_id=user_id, slot=2))
    db.flush()
    return duel, view(db, duel, user_id, now)


def set_ready(db, room, duel_id, user_id, ready, now):
    duel = visible_duel(db, room.id, duel_id, user_id)
    attempt = own_attempt(db, duel.id, user_id)
    if phase(duel, now) == "expired":
        raise problem(410, "duel_lobby_expired")
    if duel.status != "lobby":
        raise problem(409, "duel_lobby_closed")
    if ready != (attempt.ready_at is not None):
        attempt.ready_at = now if ready else None
        duel.version += 1
    players = _attempts(db, duel.id)
    if all(player.ready_at is not None for player in players):
        _require_pro_opponent(db, next(player.user_id for player in players if player.slot != attempt.slot))
        duel.status = "scheduled"
        duel.starts_at = now + START_DELAY
        duel.deadline_at = duel.starts_at + timedelta(seconds=exam_for(db, duel.id).duration_seconds)
        duel.due_at = duel.deadline_at
    return duel, view(db, duel, user_id, now)


def _writable_attempt(db, duel, user_id, revision, now):
    attempt = own_attempt(db, duel.id, user_id)
    if attempt.locked_at is not None:
        raise problem(409, "attempt_locked")
    if phase(duel, now) != "running":
        raise problem(409, "duel_not_running")
    if revision != attempt.revision:
        raise problem(409, "stale_revision", revision=attempt.revision)
    return attempt


def save_answer(db, room, duel_id, user_id, question_id, data, now):
    duel = visible_duel(db, room.id, duel_id, user_id)
    attempt = _writable_attempt(db, duel, user_id, data.expected_revision, now)
    snapshot = exam_for(db, duel.id).snapshot
    item = next((q for q in snapshot["items"] if q["id"] == question_id), None)
    if item is None:
        raise problem(404, "duel_question_not_found")
    answers = dict(attempt.answers)
    if data.answer is None:
        answers.pop(question_id, None)
    else:
        answer = data.answer.model_dump()
        if item["kind"] == "choice":
            if answer.get("choice_id") not in {c["id"] for c in item["choices"]}:
                raise problem(422, "invalid_duel_answer")
        elif "value" not in answer:
            raise problem(422, "invalid_duel_answer")
        answers[question_id] = answer
    attempt.answers = answers
    attempt.revision += 1
    attempt.answered_count = len(answers)
    duel.version += 1
    return duel, {"revision": attempt.revision, "answered_count": attempt.answered_count, "saved_at": now}


def submit(db, room, duel_id, user_id, revision, now):
    duel = visible_duel(db, room.id, duel_id, user_id)
    attempt = _writable_attempt(db, duel, user_id, revision, now)
    attempt.locked_at, attempt.lock_reason = now, "submitted"
    duel.version += 1
    attempts = _attempts(db, duel.id)
    if all(row.locked_at is not None for row in attempts):
        _grade(db, room, duel, attempts, now)
    return duel, {"submitted_at": now, "duel": view(db, duel, user_id, now), "result": duel.result}


def _result(outcome, reason, now, winner=None, scores=None):
    return {
        "outcome": outcome, "reason": reason, "winner_slot": winner,
        "scores": scores or {}, "finalized_at": now.isoformat(),
    }


def _grade(db, room, duel, attempts, now):
    from . import group_memory, room_tutor

    exam = exam_for(db, duel.id)
    snapshot = exam.snapshot
    if not any(attempt.answered_count for attempt in attempts):
        _mark_terminal(duel, "finished", now, _result("void", "no_answers", now))
        return
    scores = {}
    for attempt in attempts:
        grades = {
            item["id"]: item["points"] if exam_bank.grade_closed(item, attempt.answers.get(item["id"])) else 0
            for item in snapshot["items"]
        }
        attempt.grades = grades
        scores[str(attempt.slot)] = sum(grades.values())
        group_memory.record_duel(db, room.id, duel.id, exam.topic, snapshot["items"], attempt, now)
    tiebreak = snapshot["tiebreak_question_id"]
    tiers = [(scores[str(row.slot)], row.grades[tiebreak]) for row in attempts]
    if tiers[0] == tiers[1]:
        result = _result("draw", "equal_scores", now, scores=scores)
    else:
        winner = attempts[0].slot if tiers[0] > tiers[1] else attempts[1].slot
        reason = "tiebreak" if tiers[0][0] == tiers[1][0] else "points"
        result = _result("win", reason, now, winner, scores)
    _mark_terminal(duel, "finished", now, result)
    db.flush()
    room_tutor.queue_duel_debrief(db, room, duel_id=duel.id, language=exam.language,
                                  topic=exam.topic, concepts=[exam.topic], now=now)


def withdraw(db, room, duel_id, user_id, now):
    duel = visible_duel(db, room.id, duel_id, user_id)
    current = phase(duel, now)
    if current in ("invited", "lobby", "scheduled"):
        _mark_terminal(duel, "cancelled", now)
    elif current == "running":
        attempt = own_attempt(db, duel.id, user_id)
        if attempt.locked_at is not None:
            raise problem(409, "attempt_locked")
        for row in _attempts(db, duel.id):
            if row.locked_at is None:
                row.locked_at, row.lock_reason = now, "forfeit"
        _mark_terminal(duel, "finished", now, _result("forfeit", "conceded", now, 3 - attempt.slot))
    else:
        raise problem(409, "duel_closed")
    return duel, view(db, duel, user_id, now)


def settle_due(db, room, duel, now):
    if duel.status not in ACTIVE_STATUSES or now < duel.due_at:
        return False
    if duel.status == "scheduled":
        attempts = _attempts(db, duel.id)
        for attempt in attempts:
            if attempt.locked_at is None:
                attempt.locked_at, attempt.lock_reason = duel.deadline_at, "deadline"
        _grade(db, room, duel, attempts, now)
    else:
        _mark_terminal(duel, "expired", now)
    return True


def sweep_deadlines(db):
    now = server_now(db)
    due_rooms = list(db.scalars(
        select(Duel.room_id).where(Duel.terminal_at.is_(None), Duel.due_at <= now).order_by(Duel.due_at).limit(50)
    ))
    db.commit()
    settled = 0
    for room_id in due_rooms:
        # The same lock order as ready, save, submit and membership changes.
        room = db.scalar(select(StudyRoom).where(StudyRoom.id == room_id).with_for_update(skip_locked=True))
        duel = _room_open_duel(db, room_id) if room is not None else None
        if duel and settle_due(db, room, duel, server_now(db)):
            settled += 1
        db.commit()
    return settled


def room_playing(db, room_id: UUID) -> bool:
    return bool(db.scalar(select(exists().where(
        Duel.room_id == room_id, Duel.status == "scheduled", Duel.deadline_at > server_now(db),
    ))))


def cancel_for_member(db, room_id, user_id):
    duel = _room_open_duel(db, room_id)
    if duel and (duel.invitee_id == user_id or duel.creator_id == user_id):
        now = server_now(db)
        if not settle_due(db, db.get(StudyRoom, room_id), duel, now):
            _mark_terminal(duel, "cancelled", now)


def purge_account(db, user_id):
    """Forget historical opponent details and invalidate active work before the account cascades."""
    from . import room_tutor

    services.lock_membership_actor(db, user_id)
    rooms = db.scalars(
        select(StudyRoom).where(or_(
            exists().where(RoomMember.room_id == StudyRoom.id, RoomMember.user_id == user_id),
            exists().where(Duel.room_id == StudyRoom.id, or_(Duel.creator_id == user_id, Duel.invitee_id == user_id)),
            exists().where(
                Duel.room_id == StudyRoom.id, DuelAttempt.duel_id == Duel.id, DuelAttempt.user_id == user_id,
            ),
        )).order_by(StudyRoom.id).with_for_update()
    ).all()
    affected = {}
    for room in rooms:
        affected[room.id] = None
        if room.owner_id == user_id:
            continue
        room_tutor.invalidate(db, room)
        room_tutor.purge_contextual(db, room.id)
        affected[room.id] = room.tutor_version
        cancel_for_member(db, room.id, user_id)
        attempts = db.execute(
            select(DuelAttempt, Duel).join(Duel, Duel.id == DuelAttempt.duel_id)
            .where(Duel.room_id == room.id, DuelAttempt.user_id == user_id)
        ).all()
        for attempt, duel in attempts:
            attempt.answers, attempt.grades, attempt.answered_count = {}, {}, 0
            if duel.result:
                keep = {slot: score for slot, score in duel.result["scores"].items() if slot != str(attempt.slot)}
                duel.result = {
                    **duel.result, "outcome": "void", "reason": "participant_deleted", "winner_slot": None,
                    "scores": keep,
                }
            duel.version += 1
            db.execute(delete(DuelMutation).where(DuelMutation.duel_id == duel.id))
    return affected


def result_for(db, duel, attempt):
    from .room_tutor import RoomTutorJob

    corrections = []
    if attempt.grades:
        for item in exam_for(db, duel.id).snapshot["items"]:
            points = attempt.grades[item["id"]]
            corrections.append({
                "question_id": item["id"], "concept": item["concept"], "correct": points == item["points"],
                "points": points, "max_points": item["points"],
            })
    job = db.scalar(select(RoomTutorJob).where(RoomTutorJob.duel_id == duel.id))
    debrief_status = {
        "queued": "pending", "running": "pending", "succeeded": "ready", "failed": "failed", "cancelled": "skipped",
    }[job.state] if job else "skipped"
    return {
        **duel.result, "my_corrections": corrections, "debrief_status": debrief_status,
        "debrief": job.result_text if debrief_status == "ready" else None,
    }
