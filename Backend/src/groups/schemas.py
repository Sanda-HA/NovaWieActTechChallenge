from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StrictBool, StringConstraints, model_validator

from ..learning.schemas import QuizOut

ExplanationFormat = Literal["step_by_step", "examples", "visual", "analogy"]


class GroupCheckIn(BaseModel):
    explanation: str = Field(min_length=1, max_length=2000)


class RoomCreate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class RoomJoin(BaseModel):
    code: Annotated[str, BeforeValidator(lambda v: v.strip().upper() if isinstance(v, str) else v), StringConstraints(pattern=r"^[A-HJ-NP-Z2-9]{6}$")]


class OwnerTransfer(BaseModel):
    pseudo: Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9]{3,30}$")]


class RoomSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tutor_enabled: StrictBool | None = None
    tutor_round_prompts: StrictBool | None = None


class RoomConsentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    allow_ai_text: StrictBool | None = None
    allow_solo_context: StrictBool | None = None
    allow_personalization: StrictBool | None = None
    allow_group_insights: StrictBool | None = None


class RoomConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    allow_ai_text: bool
    allow_solo_context: bool
    allow_personalization: bool
    allow_group_insights: bool
    raw_text_allowed: bool


class RoomOut(BaseModel):
    id: UUID
    name: str
    owner: bool
    owner_pseudo: str
    members: list[str]
    active_members: list[str]
    invite_code: str
    session_round: Literal["explain", "question", "quiz", "ended"] | None
    tutor_enabled: bool
    tutor_version: int
    tutor_round_prompts: bool
    already_member: bool = False


class RoomPostIn(BaseModel):
    kind: Literal["explanation", "question"]
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
    format: ExplanationFormat | None = None

    @model_validator(mode="after")
    def format_only_on_explanations(self):
        if self.format is not None and self.kind != "explanation":
            raise ValueError("format applies to explanations only")
        return self


class RoomPostOut(BaseModel):
    id: str
    kind: Literal["explanation", "question", "tutor_reply"]
    text: str
    author: str | None
    verdict: str | None
    created_at: datetime
    format: ExplanationFormat | None = None


class SessionStart(BaseModel):
    topic: str = Field(pattern=r"^[a-z0-9_]{1,40}$")


class OpenPoint(BaseModel):
    id: str
    text: str
    verdict: str | None
    review_action: str


class SessionOut(BaseModel):
    session_id: int
    topic: str
    goal: str
    round: Literal["explain", "question", "quiz", "ended"]
    notes: list[str]
    my_open_points: list[OpenPoint]


class RoomQuizOut(QuizOut):
    language: Literal["fr", "en", "ar"]


TutorConcept = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]{1,40}$")]


class TutorRequestIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["explain", "hint"]
    source_post_id: int | None = Field(default=None, gt=0, le=2**31 - 1)
    concepts: list[TutorConcept] = Field(default_factory=list, max_length=8)


class TutorRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: Literal["explain", "hint", "round_end", "session_summary", "duel_debrief"]
    state: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    created_at: datetime
    result_post_id: int | None = None
