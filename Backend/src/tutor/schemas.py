import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

TutorSubject = Literal[
    "math", "svt", "physics", "chemistry", "french", "english", "history",
    "geography", "philosophy", "computer_science",
]

class SessionCreate(BaseModel):
    subject: TutorSubject | None = None

class SessionOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    topic: str | None
    subject: TutorSubject | None = None
    message_count: int = Field(validation_alias="turn_count")
    model_config = {"from_attributes": True}

class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    mode: Literal["explain", "guided"] = "explain"
    action: Literal["auto", "hint", "attempt", "new_question"] = "auto"

class FeedbackIn(BaseModel):
    response_id: str = Field(min_length=1, max_length=64)
    helpful: bool
    reason: Literal["wrong", "unclear", "too_long", "not_my_level", "other"] | None = None
