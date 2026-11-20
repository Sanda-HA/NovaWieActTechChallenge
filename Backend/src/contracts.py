"""Public response contracts. Additive upstream fields and trace details are retained."""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

Style = Literal["step_by_step", "examples", "visual", "analogy"]
Estimate = Literal["unknown", "fragile", "moyen", "solide"]
Badge = Literal["course", "general", "not_found", "clarify", "wellbeing", "course_excerpt"]

class ResponseModel(BaseModel):
    model_config = ConfigDict(extra="allow")

class Source(ResponseModel):
    chunk_id: str
    source: str
    page: int | None = None


class SourceExcerpt(BaseModel):
    chunk_id: str
    source: str
    page: int | None
    excerpt: str

class NextRequest(ResponseModel):
    mode: Literal["explain", "guided"]
    message: str

class NextStep(ResponseModel):
    kind: Literal["exercise", "prerequisite", "next_topic", "practice_mistake"]
    topic: str
    label: str
    request: NextRequest

class TraceStep(ResponseModel):
    name: str
    tier: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    detail: dict[str, Any] = Field(default_factory=dict)

class Receipt(ResponseModel):
    llm_calls: int = 0
    compact_calls: int = 0
    mid_calls: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    cache: Literal["exact", "evidence", "artifact"] | None = None
    events: list[str] = Field(default_factory=list)

class VerdictResult(ResponseModel):
    verdict: Literal["correct", "incomplete", "incorrect", "unknown", "wellbeing"]
    issue: str = ""
    guiding_question: str = ""
    missing_points: list[str] = Field(default_factory=list)
    restate_prompt: str = ""
    source: Source | None = None

class PeerResult(VerdictResult):
    trace: list[TraceStep] = Field(default_factory=list)
    receipt: Receipt | None = None
    capacity_level: Literal["FULL", "LEAN", "ECO", "OFFLINE"] | None = None

class ChatResult(ResponseModel):
    answer: str
    badge: Badge | None
    sources: list[Source]
    response_id: str
    mode: Literal["explain", "guided"]
    capacity_level: Literal["FULL", "LEAN", "ECO", "OFFLINE"]
    degraded: bool
    trace: list[TraceStep]
    receipt: Receipt
    topic: str | None = None
    next_step: NextStep | None = None
    hint_rung: int | None = Field(default=None, ge=0, le=3)
    retry_after: float | None = Field(default=None, ge=0)
    ai_generated: bool
    label: str
    attempt_result: VerdictResult | None = None

class StageEvent(BaseModel):
    stage: Literal["understanding", "searching", "writing", "verifying"]

class ErrorEvent(BaseModel):
    error: str

class DiagnosticPreference(BaseModel):
    id: str
    question: str
    options: dict[str, str]

class DiagnosticProbe(BaseModel):
    id: str
    concept: str
    versions: dict[str, str]

class DiagnosticQuestion(BaseModel):
    id: str
    question: str
    options: list[str]

class DiagnosticBank(BaseModel):
    preferences: list[DiagnosticPreference]
    styles_probe: DiagnosticProbe
    level_check: list[DiagnosticQuestion]

class DiagnosticResult(ResponseModel):
    style: Style
    level_estimate: Estimate
    weights: dict[str, float]
    diagnostic_score: int | None = Field(default=None, ge=0, le=3, description="Correct calculus answers, out of three; null if incomplete.")
    diagnostic_score_max: Literal[3] = 3

class TopicProgress(ResponseModel):
    topic: str
    label: str
    mastery: float | None = Field(ge=0, le=1)
    attempts: int = Field(ge=0)
    solved: int = Field(ge=0)
    confusions: int = Field(ge=0)

class ProgressResult(ResponseModel):
    style: Style
    level_estimate: Estimate
    diagnosed: bool
    topics: list[TopicProgress]
    subtopics: list["SubtopicProgress"] = Field(default_factory=list)
    mistakes: list[dict] = Field(default_factory=list)

class SubtopicProgress(TopicProgress):
    parent: str

ProgressResult.model_rebuild()

class CatalogTopic(ResponseModel):
    slug: str
    label: str
    prerequisites: list[str] = Field(default_factory=list)
    next: list[str] = Field(default_factory=list)

class CatalogSubtopic(ResponseModel):
    slug: str
    label: str
    parent: str

class TopicCatalog(ResponseModel):
    version: int
    status: str
    subject: str
    program: str
    topics: list[CatalogTopic]
    subtopics: list[CatalogSubtopic] = Field(default_factory=list)

class FeedbackResult(ResponseModel):
    removed_from_cache: int
