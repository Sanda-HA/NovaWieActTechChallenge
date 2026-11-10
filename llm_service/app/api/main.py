import asyncio
import json
from contextlib import suppress
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.agent.orchestrator import ChatRequest
from app.agent.tools import SearchRequest
from app.capacity.resilient import CapacityUnavailable
from app.config import Settings
from app.metrics import Metrics, RequestLog
from app.pedagogy import diagnostic
from app.pedagogy.peer_check import check_peer_explanation
from app.providers.platform import PlatformProvider
from app.safety.privacy import is_distress, redact, wellbeing_message
from app.sessions import LearnerDeleted
from app.trace import Trace
from app.wiring import build_service


class FeedbackRequest(BaseModel):
    response_id: str
    helpful: bool
    reason: Literal["wrong", "unclear", "too_long", "not_my_level", "other"] | None = None


class PurgeRequest(BaseModel):
    session_ids: list[str] = Field(default_factory=list)


class GroupCheckRequest(BaseModel):
    room_id: str = Field(max_length=64)
    learner_id: str = Field(max_length=64, description="pseudonym")
    explanation: str = Field(min_length=1, max_length=2000)
    reply_language: Literal["fr", "en"] = "fr"
    grade: str = Field(default="4eme_annee_secondaire", pattern=r"^[a-z0-9_]{1,40}$")
    section: str = Field(default="mathematiques", pattern=r"^[a-z0-9_]{1,40}$")
    subject: str = Field(default="math", pattern=r"^[a-z0-9_]{1,40}$")


def build(settings: Settings, provider: PlatformProvider | None = None) -> FastAPI:
    svc = build_service(settings, provider)
    orch, client, governor, rag = svc.orchestrator, svc.client, svc.governor, svc.rag
    learners, topics = svc.learners, svc.topics
    metrics, log = Metrics(), RequestLog(settings.request_log_path)
    app = FastAPI(title="EdNova LLM service")

    @app.exception_handler(LearnerDeleted)
    async def deleted_learner(request, exc):
        return JSONResponse({"detail": "learner_deleted"}, status_code=404)

    def done(response: dict, kind: str = "chat") -> dict:
        metrics.record(response, kind)
        log.write(response, kind)
        return response

    @app.get("/health")
    async def health():
        return {"ok": True, "capacity_level": governor.level.name}

    @app.post("/chat")
    async def chat(req: ChatRequest):
        return done(await orch.handle(req))

    @app.post("/chat/events")
    async def chat_events(req: ChatRequest):
        queue: asyncio.Queue = asyncio.Queue()

        async def stage(name: str) -> None:
            await queue.put(("stage", {"stage": name}))

        async def run() -> None:
            try:
                await queue.put(("result", done(await orch.handle(req, stage))))
            except Exception:
                await queue.put(("error", {"error": "internal_error"}))
            except asyncio.CancelledError:
                await queue.put(("error", {"error": "request_cancelled"}))
                raise

        async def events():
            task = asyncio.create_task(run())
            try:
                while True:
                    kind, data = await queue.get()
                    yield f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                    if kind in ("result", "error"):
                        break
            finally:
                if not task.done():
                    task.cancel()
                with suppress(asyncio.CancelledError):
                    await task

        return StreamingResponse(events(), media_type="text/event-stream")

    @app.post("/feedback")
    async def feedback(body: FeedbackRequest):
        metrics.feedback(body.helpful)
        return {"removed_from_cache": orch.feedback(body.response_id, body.helpful)}

    @app.post("/group/check")
    async def group_check(body: GroupCheckRequest):
        learners.ensure_active(body.learner_id)
        if is_distress(body.explanation):
            return {
                "verdict": "wellbeing",
                "issue": "",
                "guiding_question": wellbeing_message(body.reply_language, settings.wellbeing_contact),
                "source": None,
            }
        trace = Trace()
        text, _ = redact(body.explanation)
        search = SearchRequest(text, body.grade, body.section, body.subject, "fr", 4)
        try:
            async with asyncio.timeout(settings.request_timeout_s):
                result = await check_peer_explanation(
                    text, search, rag, client, trace, body.reply_language, fair=orch.fair, learner_id=body.learner_id
                )
        except CapacityUnavailable as e:
            raise HTTPException(503, detail={"retry_after": e.retry_after}) from e
        except TimeoutError:
            trace.events.append("request_timeout")
            result = {
                "verdict": "unknown",
                "issue": "",
                "source": None,
                "guiding_question": (
                    "The service is busy. Which definition can you check together in your textbook while you wait?"
                    if body.reply_language == "en"
                    else "Le service est occupé. Quelle définition pouvez-vous vérifier dans le manuel ?"
                ),
            }
        return done(
            {**result, "trace": trace.as_list(), "receipt": trace.receipt(), "capacity_level": governor.level.name},
            kind="group_check",
        )

    @app.get("/diagnostic")
    async def diagnostic_items():
        return diagnostic.items()

    @app.get("/topics")
    async def topic_catalog():
        return topics.catalog()

    @app.post("/diagnostic/{learner_id}")
    async def diagnostic_submit(learner_id: str, answers: dict[str, str]):
        profile = diagnostic.score(answers, learners.get(learner_id))
        learners.save(learner_id)
        return {"style": profile.style, "level_estimate": profile.level_estimate, "weights": profile.weights,
                "diagnostic_score": profile.diagnostic_score, "diagnostic_score_max": len(diagnostic.BANK["level_check"])}

    @app.get("/learner/{learner_id}/progress")
    async def progress(learner_id: str):
        p = learners.get(learner_id)
        rows = [
            {
                "topic": slug,
                "label": topics.label(slug),
                "mastery": s.mastery,
                "attempts": s.attempts,
                "solved": s.solved,
                "confusions": s.confusions,
            }
            for slug, s in p.topics.items()
        ]
        return {
            "style": p.style,
            "level_estimate": p.level_estimate,
            "diagnosed": p.diagnosed,
            "topics": sorted(rows, key=lambda r: (r["mastery"] is None, r["mastery"] or 0)),
            "subtopics": [{"topic": slug, "parent": topics.subtopics[slug]["parent"], "label": topics.label(slug),
                           "mastery": s.mastery, "attempts": s.attempts, "solved": s.solved, "confusions": s.confusions}
                          for slug, s in p.subtopics.items() if slug in topics.subtopics],
        }

    @app.delete("/learner/{learner_id}")
    async def purge_learner(learner_id: str, body: PurgeRequest):
        await orch.purge(learner_id, body.session_ids)
        return {"deleted": True}

    @app.get("/metrics")
    async def get_metrics():
        return metrics.snapshot()

    return app


def create_app() -> FastAPI:
    return build(Settings.from_env())
