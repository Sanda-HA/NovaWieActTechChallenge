from datetime import datetime
from pydantic import BaseModel

class StudySessionOut(BaseModel):
    id: int
    started_at: datetime
    ended_at: datetime | None
    model_config = {"from_attributes": True}

class StudySummary(BaseModel):
    minutes_today: int
    minutes_week: int
    streak_days: int
    in_progress: bool
    started_at: datetime | None = None
