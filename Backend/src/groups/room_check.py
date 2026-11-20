"""Explanation check for a study room: model feedback when consent and deployment allow it, else a checklist."""

import asyncio
import logging

from fastapi import HTTPException
from pydantic import ValidationError

from ..contracts import PeerResult
from . import room_sessions
from .room_tutor_context import raw_text_allowed

logger = logging.getLogger("ednova.room_check")

CHECK_TIMEOUT_S = 25.0
SUMMARY_MAX = 300


def checklist_result(language: str, reason: str | None) -> dict:
    return {**room_sessions.checklist(language), "mode": "checklist", "fallback_reason": reason,
            "summary": "", "point_feedback": []}


def unavailable_reason(plan: str, allow_ai_text: bool) -> str | None:
    if plan != "pro":
        return "pro_required"
    if not allow_ai_text:
        return "consent_required"
    if not raw_text_allowed():
        return "raw_text_disabled"
    return None


def _ai_result(language: str, checked: PeerResult) -> dict:
    base = checklist_result(language, None)
    feedback = checked.model_dump(mode="json", exclude_unset=True)
    summary = checked.issue or checked.restate_prompt or checked.guiding_question
    return {
        **base, **feedback, "mode": "ai",
        "summary": summary[:SUMMARY_MAX],
        "point_feedback": [{"point": point, "status": "missing"} for point in checked.missing_points],
    }


async def evaluate(agent, payload: dict, language: str) -> dict:
    try:
        raw = await asyncio.wait_for(agent.group_check(payload), CHECK_TIMEOUT_S)
        return _ai_result(language, PeerResult.model_validate(raw))
    except (HTTPException, asyncio.TimeoutError, ValidationError) as error:
        logger.warning("room check fell back to the checklist: %s", type(error).__name__)
        return checklist_result(language, "agent_unavailable")
