from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


Phase = Literal["invited", "lobby", "scheduled", "running", "grading", "finished", "expired", "cancelled"]


class DuelCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    blueprint_id: str = Field(pattern=r"^[a-z0-9_-]{1,80}$")
    opponent_pseudo: str | None = Field(default=None, pattern=r"^[A-Za-z0-9]{3,30}$")


class DuelJoin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: Annotated[str, StringConstraints(strip_whitespace=True, to_upper=True, min_length=8, max_length=8)]


class ReadyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ready: bool = Field(strict=True)


class ChoiceAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    choice_id: str = Field(min_length=1, max_length=80)


class ValueAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


Answer = ChoiceAnswer | ValueAnswer


class RevisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(strict=True, ge=0)


class AnswerUpdate(RevisionIn):
    answer: Answer | None


class PlayerView(BaseModel):
    slot: Literal[1, 2]
    pseudo: str | None
    ready: bool
    answered_count: int
    submission_state: Literal["open", "submitted", "deadline", "forfeit"]


class DuelView(BaseModel):
    duel_id: UUID
    blueprint_id: str
    topic: str
    language: str
    status: Phase
    version: int
    server_now: datetime
    invite_expires_at: datetime
    ready_expires_at: datetime | None = None
    starts_at: datetime | None = None
    deadline_at: datetime | None = None
    my_slot: Literal[1, 2] | None
    players: list[PlayerView]
    invite_code: str | None = None


class DuelList(BaseModel):
    items: list[DuelView]


class ChoiceView(BaseModel):
    id: str
    text: str


class ExamQuestionView(BaseModel):
    id: str
    kind: Literal["choice", "number", "text"]
    prompt: str
    choices: list[ChoiceView]
    points: int


class ExamView(BaseModel):
    exam_id: UUID
    language: str
    questions: list[ExamQuestionView]


class AttemptView(BaseModel):
    attempt_id: UUID
    revision: int
    answers: dict[str, Answer]
    submitted_at: datetime | None


class AnswerReceipt(BaseModel):
    revision: int
    answered_count: int
    saved_at: datetime


class ResultSummary(BaseModel):
    outcome: Literal["win", "draw", "forfeit", "void"]
    reason: str
    winner_slot: Literal[1, 2] | None
    scores: dict[str, int]
    finalized_at: datetime


class SubmitReceipt(BaseModel):
    submitted_at: datetime
    duel: DuelView
    result: ResultSummary | None


class Correction(BaseModel):
    question_id: str
    concept: str
    correct: bool
    points: int
    max_points: int


class ResultView(ResultSummary):
    my_corrections: list[Correction]
    debrief_status: Literal["pending", "ready", "skipped", "failed"]
    debrief: str | None


class PendingResult(BaseModel):
    status: Phase


class BlueprintView(BaseModel):
    id: str
    topic: str
    language: str
    duration_seconds: int
    item_count: int
