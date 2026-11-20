import asyncio
import hashlib
import hmac
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import Lock
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, StringConstraints, ValidationError
from sqlalchemy import and_, delete, exists, func, or_, select, update

from ..ai.interface import AgentClient
from ..learning.services import student_plan_for
from ..config import settings
from ..Database.core import DbSession, SessionLocal
from . import posts, room_sessions
from .models import RoomMember, RoomPost, RoomSession, RoomTutorJob, StudyRoom
from .room_tutor_context import DEFAULT_STYLE, EXPLICIT, allowed_concepts, private_reference, tutor_payload

COOLDOWN = timedelta(seconds=30)
LEASE = timedelta(seconds=90)  # The agent client has a 60-second request deadline.
ROUTINE_LIMIT = 12
ROUTINE = (*EXPLICIT, "round_end")
PENDING = ("queued", "running")
logger = logging.getLogger("ednova.room_tutor")
permit_router = APIRouter(include_in_schema=False)


class TutorResult(BaseModel):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=420)]
    status: Literal["generated", "fallback", "blocked"]


class TutorPermit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: UUID
    lease_token: UUID
    phase: Literal["retrieve", "infer"]


@dataclass(frozen=True)
class Dispatch:
    room_id: UUID
    job_id: UUID
    version: int
    token: UUID


_local_dispatches: dict[UUID, tuple[Dispatch, asyncio.Task]] = {}
_dispatch_lock = Lock()


def _now() -> datetime:
    return datetime.now(UTC)


def require_no_duel(db, room_id: UUID) -> None:
    if _duel_active(db, room_id):
        raise HTTPException(409, detail={"error": "duel_in_progress"})


def _duel_active(db, room_id: UUID) -> bool:
    from .duel_services import room_playing

    return room_playing(db, room_id)


def invalidate(db, room: StudyRoom) -> None:
    """Fence old dispatches while retaining in-flight leases until completion or expiry."""
    room.tutor_version += 1
    db.execute(
        update(RoomTutorJob)
        .where(RoomTutorJob.room_id == room.id, RoomTutorJob.state.in_(PENDING))
        .values(state="cancelled", finished_at=_now(), payload_digest=None)
    )


def purge_contextual(db, room_id: UUID) -> None:
    """Remove shared results that used private input. Caller holds the room lock."""
    scope = (
        RoomTutorJob.room_id == room_id, RoomTutorJob.used_private_context.is_(True),
        RoomTutorJob.state == "succeeded",
    )
    result_ids = select(RoomTutorJob.result_post_id).where(*scope, RoomTutorJob.result_post_id.is_not(None))
    db.execute(delete(RoomPost).where(RoomPost.room_id == room_id, RoomPost.id.in_(result_ids)))
    db.execute(update(RoomTutorJob).where(*scope).values(state="cancelled", result_text=None, result_post_id=None))


def cancel_local(room_id: UUID, *, before_version: int | None = None) -> None:
    with _dispatch_lock:
        entries = list(_local_dispatches.values())
    for dispatch, task in entries:
        if dispatch.room_id == room_id and (before_version is None or dispatch.version < before_version):
            try:
                task.get_loop().call_soon_threadsafe(task.cancel)
            except RuntimeError:
                # The worker may have stopped since this dispatch was registered.
                continue


def _existing(db, room, source_key=None, idempotency_key=None) -> RoomTutorJob | None:
    sources = []
    if source_key is not None:
        sources.append(RoomTutorJob.source_key == source_key)
    if idempotency_key is not None:
        sources.append(RoomTutorJob.idempotency_key == idempotency_key)
    if not sources:
        return None
    return db.scalar(
        select(RoomTutorJob)
        .where(RoomTutorJob.room_id == room.id, RoomTutorJob.version == room.tutor_version, or_(*sources))
        .order_by((RoomTutorJob.idempotency_key == idempotency_key).desc().nulls_last(), RoomTutorJob.created_at)
        .limit(1)
    )


def _enqueue(
    db, room, *, kind, topic, language, concepts, now, source_key, session=None, duel_id=None,
    requester_id=None, source_post_id=None, idempotency_key=None,
) -> RoomTutorJob:
    if session is not None and kind in ROUTINE:
        session.tutor_routine_count += 1
    job = RoomTutorJob(
        room_id=room.id, version=room.tutor_version, session_id=session.id if session is not None else None,
        duel_id=duel_id,
        requester_id=requester_id, source_post_id=source_post_id, source_key=source_key,
        idempotency_key=idempotency_key, kind=kind, topic=topic, language=language,
        concepts=concepts, created_at=now,
    )
    db.add(job)
    db.flush()
    return job


def _validate_concepts(topic: str, concepts) -> list[str]:
    validated = sorted(set(concepts or (topic,)))
    if not set(validated) <= allowed_concepts(topic):
        raise HTTPException(422, detail={"error": "invalid_tutor_concepts"})
    return validated


def _routine_available(db, room_id, session, now) -> bool:
    recent = db.scalar(select(exists().where(
        RoomTutorJob.room_id == room_id,
        or_(
            RoomTutorJob.state.in_(PENDING),
            RoomTutorJob.lease_until > now,
            RoomTutorJob.created_at > now - COOLDOWN,
            RoomTutorJob.dispatched_at > now - COOLDOWN,
        ),
    )))
    return not recent and session.tutor_routine_count < ROUTINE_LIMIT


def request(db, room, user_id, language, data, idempotency_key) -> RoomTutorJob:
    if not room.tutor_enabled:
        raise HTTPException(409, detail={"error": "room_tutor_disabled"})
    session = room_sessions.open_session(db, room.id)
    concepts = _validate_concepts(session.topic, data.concepts)
    source_key = None
    if data.source_post_id is not None:
        source = db.get(RoomPost, data.source_post_id)
        if (source is None or source.room_id != room.id or source.session_id != session.id
                or source.kind not in {"explanation", "question"}):
            raise HTTPException(404, detail={"error": "tutor_source_not_found"})
        source_key = f"post:{session.id}:{data.kind}:{source.id}"
    hashed_key = None
    if idempotency_key is not None:
        hashed_key = hashlib.sha256(f"{user_id}:{session.id}:{idempotency_key}".encode()).hexdigest()
    elif source_key is None:
        digest = hashlib.sha256(",".join(concepts).encode()).hexdigest()
        source_key = f"concept:{session.id}:{data.kind}:{digest}"
    if job := _existing(db, room, source_key, hashed_key):
        if hashed_key is not None and job.idempotency_key == hashed_key and (
            data.kind != job.kind or data.source_post_id != job.source_post_id or concepts != job.concepts
        ):
            raise HTTPException(409, detail={"error": "idempotency_key_conflict"})
        return job
    now = _now()
    if not _routine_available(db, room.id, session, now):
        raise HTTPException(429, detail={"error": "room_tutor_throttled"})
    return _enqueue(
        db, room, kind=data.kind, topic=session.topic, language=language, concepts=concepts, now=now,
        session=session, requester_id=user_id, source_post_id=data.source_post_id,
        source_key=source_key, idempotency_key=hashed_key,
    )


def read_request(db, room_id, request_id) -> RoomTutorJob:
    job = db.get(RoomTutorJob, request_id)
    if job is None or job.room_id != room_id or job.kind == "duel_debrief":
        raise HTTPException(404, detail={"error": "tutor_request_not_found"})
    return job


def queue_round_trigger(db, room, session, kind) -> RoomTutorJob | None:
    if not room.tutor_enabled or not room.tutor_round_prompts or _duel_active(db, room.id):
        return None
    source = f"auto:{session.id}:{kind}:{session.round}"
    if job := _existing(db, room, source):
        return job
    now = _now()
    if kind == "round_end" and not _routine_available(db, room.id, session, now):
        return None
    return _enqueue(
        db, room, kind=kind, topic=session.topic, language=session.lang, concepts=[session.topic],
        now=now, source_key=source, session=session,
    )


def queue_duel_debrief(db, room, *, duel_id, language, topic, concepts, now) -> RoomTutorJob | None:
    """Called under the room lock, after recording the completed duel."""
    if not room.tutor_enabled:
        return None
    source = f"duel:{duel_id}"
    existing = db.scalar(select(RoomTutorJob).where(RoomTutorJob.room_id == room.id, RoomTutorJob.duel_id == duel_id))
    if existing is not None:
        return existing
    return _enqueue(
        db, room, kind="duel_debrief", topic=topic, language=language, concepts=_validate_concepts(topic, concepts),
        now=now, source_key=source, duel_id=duel_id,
    )


def _finish(job: RoomTutorJob, state: str, now: datetime) -> None:
    job.state = state
    job.lease_token = None
    job.lease_until = None
    job.payload_digest = None
    job.finished_at = now


def _reserve() -> Dispatch | bool | None:
    now = _now()
    with SessionLocal() as db:
        def room_jobs(*where):
            return exists().where(RoomTutorJob.room_id == StudyRoom.id, *where).correlate(StudyRoom)

        expired = room_jobs(RoomTutorJob.state == "running", RoomTutorJob.lease_until <= now)
        queued = room_jobs(RoomTutorJob.state == "queued")
        unavailable = room_jobs(or_(
            RoomTutorJob.lease_until > now,
            RoomTutorJob.dispatched_at > now - COOLDOWN,
        ))
        oldest = (
            select(func.min(RoomTutorJob.created_at))
            .where(RoomTutorJob.room_id == StudyRoom.id, RoomTutorJob.state.in_(PENDING))
            .correlate(StudyRoom)
            .scalar_subquery()
        )
        room = db.scalar(
            select(StudyRoom)
            .where(or_(expired, and_(queued, ~unavailable)))
            .order_by(oldest, StudyRoom.id)
            .limit(1)
            .with_for_update(of=StudyRoom, skip_locked=True)
        )
        if room is None:
            return None
        running = db.scalar(select(RoomTutorJob).where(RoomTutorJob.room_id == room.id, RoomTutorJob.state == "running"))
        if running is not None:
            if running.lease_until is None or running.lease_until <= now:
                _finish(running, "failed", now)
                db.commit()
                return True
            return None
        job = db.scalar(
            select(RoomTutorJob)
            .where(RoomTutorJob.room_id == room.id, RoomTutorJob.state == "queued")
            .order_by(RoomTutorJob.created_at, RoomTutorJob.id)
            .limit(1)
        )
        if job is None:
            return None
        if not _permitted(db, room, job):
            _finish(job, "cancelled", now)
            db.commit()
            return True
        token = uuid4()
        job.state = "running"
        job.dispatched_at = now
        job.lease_until = now + LEASE
        job.lease_token = token
        dispatch = Dispatch(room.id, job.id, job.version, token)
        db.commit()
        return dispatch


def _permitted(db, room, job) -> bool:
    if not room.tutor_enabled or job.version != room.tutor_version or _duel_active(db, room.id):
        return False
    # A Free participant's Ask Nova request is sponsored by the Pro host.
    sponsors = (job.requester_id, room.owner_id) if job.kind in EXPLICIT else (room.owner_id,)
    if not any(sid is not None and student_plan_for(db, sid) == "pro" for sid in sponsors):
        return False
    if job.kind == "duel_debrief":
        return True
    session = db.get(RoomSession, job.session_id) if job.session_id is not None else None
    if session is None or session.room_id != room.id:
        return False
    if job.kind in {"round_end", "session_summary"} and not room.tutor_round_prompts:
        return False
    if job.kind == "session_summary":
        return session.round == "ended"
    if session.round == "ended":
        return False
    if job.kind in EXPLICIT:
        return job.requester_id is not None and db.get(RoomMember, (room.id, job.requester_id)) is not None
    return True


def _locked_job(db, room_id: UUID, job_id: UUID, token: UUID):
    room = db.get(StudyRoom, room_id, with_for_update=True)
    if room is None:
        return None, None
    job = db.get(RoomTutorJob, job_id)
    if job is None or job.room_id != room_id or job.lease_token != token:
        return room, None
    return room, job


def _payload(db, job) -> dict:
    member = db.get(RoomMember, (job.room_id, job.requester_id)) if job.requester_id is not None else None
    return tutor_payload(db, job, member)


def _payload_digest(payload: dict) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hmac.digest(settings.secret_key.encode(), b"room-tutor-permit:" + serialized.encode(), "sha256").hex()


def _live_lease(db, room, job, now: datetime) -> bool:
    return bool(job and job.state == "running" and job.lease_until is not None
                and job.lease_until > now and _permitted(db, room, job))


@permit_router.post("/internal/room-tutor/permit", status_code=204, response_class=Response)
def permit_tutor_phase(data: TutorPermit, db: DbSession):
    room_id = db.scalar(select(RoomTutorJob.room_id).where(
        RoomTutorJob.id == data.job_id, RoomTutorJob.lease_token == data.lease_token,
    ))
    if room_id is None:
        return Response(status_code=403)
    room, job = _locked_job(db, room_id, data.job_id, data.lease_token)
    now = _now()
    if not _live_lease(db, room, job, now) or job.payload_digest is None:
        return Response(status_code=403)
    if data.phase == "retrieve":
        if job.retrieve_permitted_at is not None:
            return Response(status_code=403)
    elif job.retrieve_permitted_at is None or job.infer_permitted_at is not None:
        return Response(status_code=403)
    if not hmac.compare_digest(job.payload_digest, _payload_digest(_payload(db, job))):
        return Response(status_code=403)
    if data.phase == "retrieve":
        job.retrieve_permitted_at = now
    else:
        job.infer_permitted_at = now
    db.commit()
    return Response(status_code=204)


def _preflight(dispatch: Dispatch) -> dict | None:
    with SessionLocal() as db:
        room, job = _locked_job(db, dispatch.room_id, dispatch.job_id, dispatch.token)
        if job is None:
            return None
        if _live_lease(db, room, job, _now()):
            payload = _payload(db, job)
            job.payload_digest = _payload_digest(payload)
            db.commit()
            return payload
        _finish(job, "cancelled", _now())
        db.commit()
        return None


def _complete(dispatch: Dispatch, sent: dict | None, result: TutorResult | None) -> None:
    with SessionLocal() as db:
        room, job = _locked_job(db, dispatch.room_id, dispatch.job_id, dispatch.token)
        if job is None:
            return
        now = _now()
        if sent is not None:
            job.used_private_context = sent["concepts"] != job.concepts or any(
                key in sent for key in ("question", "recent", "style", "level")
            )
        eligible = _live_lease(db, room, job, now)
        if not eligible or (sent is not None and _payload(db, job) != sent):
            _finish(job, "cancelled", now)
        elif (result is None or result.status == "blocked" or "\x00" in result.text
              or len(result.text) > (420 if job.kind in EXPLICIT else 300)
              or private_reference(db, job.room_id, result.text)):
            _finish(job, "failed", now)
        else:
            if job.kind != "duel_debrief":
                post = posts.add(
                    db, room.id, "tutor_reply", result.text, "Nova", None, session_id=job.session_id,
                    explanation_format=(sent or {}).get("style", DEFAULT_STYLE) if result.status == "generated" else None,
                )
                job.result_post_id = int(post["id"])
            job.result_text = result.text
            _finish(job, "succeeded", now)
        db.commit()


async def run_one_job(agent: AgentClient) -> bool:
    """Process an eligible request or an expired lease, releasing DB locks during inference."""
    reserved = await asyncio.to_thread(_reserve)
    if not isinstance(reserved, Dispatch):
        return reserved is True
    sent = None
    result = None

    async def infer():
        nonlocal sent
        sent = await asyncio.to_thread(_preflight, reserved)
        if sent is not None:
            request = {**sent, "job_id": str(reserved.job_id), "lease_token": str(reserved.token)}
            return TutorResult.model_validate(await agent.room_tutor(request))
        return None

    task = asyncio.create_task(infer())
    with _dispatch_lock:
        _local_dispatches[reserved.token] = (reserved, task)
    try:
        result = await task
    except (HTTPException, ValidationError):
        logger.info("Room tutor agent unavailable or invalid response")
    except asyncio.CancelledError:
        if asyncio.current_task().cancelling():
            raise
    finally:
        with _dispatch_lock:
            _local_dispatches.pop(reserved.token, None)
        await asyncio.to_thread(_complete, reserved, sent, result)
    return True
