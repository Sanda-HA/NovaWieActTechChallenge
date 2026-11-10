from typing import Annotated, Literal
from pydantic import BaseModel, Field

Slug = Annotated[str, Field(pattern=r"^[a-z0-9_]{1,40}$")]
Presentation = Literal["visual", "reading"]
StudyTool = Literal["guided", "feynman"]

class ProfileUpdate(BaseModel):
    level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
    subjects: list[str] | None = None
    preferred_format: str | None = Field(default=None, pattern="^(analogy|examples|steps)$")
    city: str | None = Field(default=None, max_length=50)
    grade: Slug | None = None
    section: Slug | None = None
    subject: Slug | None = None
    reply_language: Literal["fr", "en"] | None = None
    presentation: Presentation | None = None
    enabled_tools: list[StudyTool] | None = Field(default=None, max_length=2)
     
     
class ProfileOut(BaseModel):
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


class DiagnosticSubmit(BaseModel):
    answers: dict[str, Annotated[str, Field(max_length=100)]] = Field(max_length=50)
