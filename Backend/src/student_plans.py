from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, model_validator

StudentPlan = Literal["free", "pro"]
ProFeature = Literal[
    "personal_quiz", "mistake_practice", "host_session", "group_sessions",
    "interactive_lab", "revision_pack", "bac_practice", "mind_map",
]


class LearnerInput(BaseModel):
    """Reject learner attempts to change a plan through self-service payloads."""

    @model_validator(mode="before")
    @classmethod
    def reject_student_plan(cls, data):
        if isinstance(data, dict) and "student_plan" in data:
            raise ValueError("student_plan is read-only")
        return data


def require_pro(plan: StudentPlan, feature: ProFeature) -> None:
    if plan != "pro":
        raise HTTPException(403, detail={"error": "pro_required", "feature": feature})
