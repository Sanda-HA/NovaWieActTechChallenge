from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, Field, StringConstraints
from ..student_plans import LearnerInput, StudentPlan

Slug = Annotated[str, Field(pattern=r"^[a-z0-9_]{1,40}$")]
Presentation = Literal["visual", "reading"]
StudyTool = Literal["guided", "feynman"]

class ProfileUpdate(LearnerInput):
    level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
    subjects: list[str] | None = None
    preferred_format: str | None = Field(default=None, pattern="^(analogy|examples|steps)$")
    city: str | None = Field(default=None, max_length=50)
    grade: Slug | None = None
    section: Slug | None = None
    subject: Slug | None = None
    reply_language: Literal["fr", "en", "ar"] | None = None
    presentation: Presentation | None = None
    enabled_tools: list[StudyTool] | None = Field(default=None, max_length=2)
     
     
class ProfileOut(BaseModel):
    pro_requested: bool
    student_plan: StudentPlan
    level:str
    subjects:list[str]
    preferred_format:str
    diagnostic_score: int|None
    city:str|None
    grade: str
    section: str
    subject: str
    reply_language: str
    presentation: Presentation | None
    enabled_tools: list[StudyTool]
    model_config = {
        "from_attributes": True
    }


class MistakePracticeIn(BaseModel):
    topic: Slug
    type: Literal["concept", "calculation", "notation", "incomplete"]


class MistakePracticeOut(BaseModel):
    session_id: UUID
    message: str


class GroupReviewItem(BaseModel):
    topic: Slug
    concept: Slug
    priority: Literal[1, 2]
    review_until: datetime


class GroupReview(BaseModel):
    items: list[GroupReviewItem]


class DiagnosticSubmit(BaseModel):
    answers: dict[str, Annotated[str, Field(max_length=100)]] = Field(max_length=50)


class QuizSource(BaseModel):
    chunk_id: str
    source: str
    page: int | None = None


class AgentQuestion(BaseModel):
    id: str
    question: str
    choices: list[str] = Field(min_length=4, max_length=4)
    answer_index: int = Field(ge=0, le=3)
    explanation: str = ""
    source: QuizSource | None = None


class AgentQuiz(BaseModel):
    topic: str
    questions: list[AgentQuestion] = Field(min_length=1, max_length=10)


class QuizQuestionOut(BaseModel):
    id: str
    question: str
    choices: list[str]


class QuizOut(BaseModel):
    quiz_id: str
    topic: str
    questions: list[QuizQuestionOut]


class TimedQuizOut(QuizOut):
    duration_seconds: Literal[600] = 600


RevisionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=800)]


class RevisionPoint(BaseModel):
    text: RevisionText
    source: QuizSource


class RecallCard(BaseModel):
    question: RevisionText
    answer: RevisionText
    source: QuizSource


class RevisionPack(BaseModel):
    topic: Literal["derivabilite"]
    sheet: list[RevisionPoint] = Field(min_length=1, max_length=4)
    cards: list[RecallCard] = Field(min_length=3, max_length=3)


class LabSeries(BaseModel):
    label: str
    style: Literal["line", "dashed", "points", "bars", "area"]
    paths: list[list[tuple[float, float]]]


class LabFrame(BaseModel):
    value: float
    answer: float
    feedback: str
    series: list[LabSeries]


class LabActivity(BaseModel):
    topic: str
    title: str
    instruction: str
    parameter: str
    bounds: tuple[float, float, float, float]
    frames: list[LabFrame]
    equal_axes: bool


class LabCase(BaseModel):
    label: str
    context: str
    question: str
    choices: list[str]
    answer_index: int
    feedback: str


class CourseLabActivity(BaseModel):
    topic: str
    title: str
    instruction: str
    cases: list[LabCase]


class QuizAnswers(BaseModel):
    answers: dict[str, Annotated[int, Field(ge=0, le=3)]] = Field(max_length=10)


class QuizResultItem(BaseModel):
    id: str
    correct: bool
    answer_index: int
    explanation: str
    source: QuizSource | None


class QuizGrade(BaseModel):
    score: int
    total: int
    results: list[QuizResultItem]
