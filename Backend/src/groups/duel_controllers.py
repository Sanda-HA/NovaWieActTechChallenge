from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Path, Response
from fastapi.responses import JSONResponse

from ..auth.services import CurrentUser
from ..Database.core import DbSession
from ..learning import exam_bank
from . import duel_services as duels
from . import services
from .access import authorize_group_sessions
from .duel_schemas import (
    AnswerReceipt, AnswerUpdate, AttemptView, BlueprintView, DuelCreate, DuelJoin, DuelList, DuelView,
    ExamView, PendingResult, Phase, ReadyUpdate, ResultView, RevisionIn, SubmitReceipt,
)


def _private_response(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


router = APIRouter(
    prefix="/groups/rooms/{room_id}/duels", tags=["duels"],
    dependencies=[Depends(authorize_group_sessions), Depends(_private_response)],
)
MutationKey = Annotated[str, Header(alias="Idempotency-Key", pattern=r"^[A-Za-z0-9_.:-]{1,128}$")]


@router.get("/blueprints", response_model=list[BlueprintView])
def list_blueprints(room_id: UUID, user: CurrentUser, db: DbSession):
    services.member_room(db, user.id, room_id)
    return exam_bank.list_blueprints(db)


@router.post("", response_model=DuelView, status_code=201)
def create_duel(room_id: UUID, body: DuelCreate, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, "create", body.model_dump(),
        lambda room, now: duels.create(db, room, user.id, body, now),
    )


@router.get("", response_model=DuelList)
def list_duels(room_id: UUID, user: CurrentUser, db: DbSession, status: Phase | None = None):
    services.member_room(db, user.id, room_id)
    return {"items": duels.list_for_member(db, room_id, user.id, status)}


@router.post("/join", response_model=DuelView)
def join_duel(room_id: UUID, body: DuelJoin, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, "join", body.model_dump(),
        lambda room, now: duels.join_by_code(db, room, user.id, body.code, now),
    )


@router.post("/{duel_id}/accept", response_model=DuelView)
def accept_duel(room_id: UUID, duel_id: UUID, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, f"accept:{duel_id}", {},
        lambda room, now: duels.accept_named(db, room, duel_id, user.id, now),
    )


@router.put("/{duel_id}/ready", response_model=DuelView)
def set_ready(room_id: UUID, duel_id: UUID, body: ReadyUpdate, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, f"ready:{duel_id}", body.model_dump(),
        lambda room, now: duels.set_ready(db, room, duel_id, user.id, body.ready, now),
    )


@router.get("/{duel_id}", response_model=DuelView)
def read_duel(room_id: UUID, duel_id: UUID, user: CurrentUser, db: DbSession):
    duel = duels.visible_duel(db, room_id, duel_id, user.id)
    return duels.view_with_invite(db, duel, user.id, duels.server_now(db))


@router.get("/{duel_id}/exam", response_model=ExamView)
def read_exam(room_id: UUID, duel_id: UUID, user: CurrentUser, db: DbSession):
    duel = duels.visible_duel(db, room_id, duel_id, user.id)
    duels.own_attempt(db, duel.id, user.id)
    if duels.phase(duel, duels.server_now(db)) not in ("running", "grading", "finished"):
        raise duels.problem(409, "duel_exam_unavailable")
    exam = duels.exam_for(db, duel.id)
    return {
        "exam_id": exam.id, "language": exam.language,
        "questions": [
            {key: item[key] for key in ("id", "kind", "prompt", "choices", "points")} for item in exam.snapshot["items"]
        ],
    }


@router.get("/{duel_id}/attempt", response_model=AttemptView)
def read_attempt(room_id: UUID, duel_id: UUID, user: CurrentUser, db: DbSession):
    duel = duels.visible_duel(db, room_id, duel_id, user.id)
    attempt = duels.own_attempt(db, duel.id, user.id)
    return {
        "attempt_id": attempt.id, "revision": attempt.revision,
        "answers": attempt.answers, "submitted_at": attempt.locked_at,
    }


@router.put("/{duel_id}/attempt/answers/{question_id}", response_model=AnswerReceipt)
def save_answer(
    room_id: UUID, duel_id: UUID, question_id: Annotated[str, Path(min_length=1, max_length=80)],
    body: AnswerUpdate, key: MutationKey, user: CurrentUser, db: DbSession,
):
    return duels.mutate(
        db, room_id, user.id, key, f"answer:{duel_id}:{question_id}", body.model_dump(),
        lambda room, now: duels.save_answer(db, room, duel_id, user.id, question_id, body, now),
    )


@router.post("/{duel_id}/attempt/submit", response_model=SubmitReceipt)
def submit_duel(room_id: UUID, duel_id: UUID, body: RevisionIn, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, f"submit:{duel_id}", body.model_dump(),
        lambda room, now: duels.submit(db, room, duel_id, user.id, body.expected_revision, now),
    )


@router.post("/{duel_id}/withdraw", response_model=DuelView)
def withdraw_duel(room_id: UUID, duel_id: UUID, key: MutationKey, user: CurrentUser, db: DbSession):
    return duels.mutate(
        db, room_id, user.id, key, f"withdraw:{duel_id}", {},
        lambda room, now: duels.withdraw(db, room, duel_id, user.id, now),
    )


@router.get("/{duel_id}/result", response_model=ResultView, responses={202: {"model": PendingResult}})
def read_result(room_id: UUID, duel_id: UUID, user: CurrentUser, db: DbSession):
    duel = duels.visible_duel(db, room_id, duel_id, user.id)
    attempt = duels.own_attempt(db, duel.id, user.id)
    current = duels.phase(duel, duels.server_now(db))
    if current in ("expired", "cancelled"):
        raise duels.problem(410, "duel_closed")
    if current != "finished":
        return JSONResponse({"status": current}, status_code=202, headers={"Cache-Control": "private, no-store"})
    return duels.result_for(db, duel, attempt)
