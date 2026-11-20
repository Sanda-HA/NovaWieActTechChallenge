from datetime import datetime
from pydantic import BaseModel, Field

class StudyStart(BaseModel):
    minutes: float | None = Field(default=None, gt=0, le=240)

class StudySessionOut(BaseModel):
    id: int
    started_at: datetime
    ended_at: datetime | None
    planned_end: datetime | None = None
    model_config = {"from_attributes": True}

class StudyHistoryItem(BaseModel):
    id: int
    started_at: datetime
    ended_at: datetime
    minutes: int

class StudySummary(BaseModel):
    minutes_today: int
    minutes_week: int
    streak_days: int
    in_progress: bool
    started_at: datetime | None = None
    planned_end: datetime | None = None
