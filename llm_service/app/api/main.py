import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from contextlib import suppress
from functools import partial
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.agent.orchestrator import ChatRequest
from app.agent.tools import RagUnavailable, SearchRequest
from app.capacity.fairness import FairShare
from app.capacity.resilient import CapacityUnavailable
from app.config import Settings
from app.metrics import Metrics, RequestLog
from app.pedagogy import diagnostic
from app.pedagogy.mind_map import InvalidMap, MapRequest, build_mind_map
from app.pedagogy.peer_check import check_peer_explanation
from app.pedagogy.quiz import NotInCourse, QuizUnavailable, build_quiz
from app.pedagogy.revision_pack import RevisionUnavailable, build_revision_pack
from app.pedagogy.room import write_goal, write_notes, write_prompt
from app.pedagogy.room_tutor import (
    RoomTutorPermit,
    RoomTutorRequest,
    room_concept_labels,
    room_tutor_fallback,
    tutor_room,
    verify_backend_permit,
)
from app.providers.platform import PlatformProvider, Tier
from app.routing.router import RouteContext
from app.safety.privacy import is_distress, redact, wellbeing_message
from app.sessions import LearnerDeleted
from app.trace import Trace
from app.wiring import build_service

logger = logging.getLogger("ednova.agent")

BUSY_GROUP = {
    "fr": "Le service est occupé. Quelle définition pouvez-vous vérifier dans le manuel ?",
    "en": "The service is busy. Which definition can you check together in your textbook while you wait?",
    "ar": "الخدمة مشغولة. ما التعريف الذي يمكنكم التحقق منه معًا في الكتاب المدرسي أثناء الانتظار؟",
}


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
    reply_language: Literal["fr", "en", "ar"] = "fr"
    grade: str = Field(default="4eme_annee_secondaire", pattern=r"^[a-z0-9_]{1,40}$")
    section: str = Field(default="mathematiques", pattern=r"^[a-z0-9_]{1,40}$")
    subject: str = Field(default="math", pattern=r"^[a-z0-9_]{1,40}$")


class QuizRequest(BaseModel):
    learner_id: str = Field(max_length=64, description="pseudonym")
    topic: str = Field(pattern=r"^[a-z0-9_]{1,40}$")
    reply_language: Literal["fr", "en", "ar"] = "fr"
    grade: str = Field(default="4eme_annee_secondaire", pattern=r"^[a-z0-9_]{1,40}$")
    section: str = Field(default="mathematiques", pattern=r"^[a-z0-9_]{1,40}$")
    subject: str = Field(default="math", pattern=r"^[a-z0-9_]{1,40}$")


class RoomGoalRequest(BaseModel):
    learner_id: str = Field(max_length=64, description="pseudonym")
    topic: str = Field(pattern=r"^[a-z0-9_]{1,40}$")
    reply_language: Literal["fr", "en", "ar"] = "fr"


class RoomPromptRequest(BaseModel):
    learner_id: str = Field(max_length=64, description="pseudonym")
    goal: str = Field(min_length=1, max_length=300)
    recent: list[Annotated[str, Field(max_length=1000)]] = Field(default_factory=list, max_length=5)
    reply_language: Literal["fr", "en", "ar"] = "fr"


class RoomPostIn(BaseModel):
    kind: Literal["explanation", "question"]
    text: str = Field(min_length=1, max_length=1000)
    verdict: str | None = Field(default=None, pattern=r"^[a-z_]{1,20}$")


class RoomNotesRequest(BaseModel):
    learner_id: str = Field(max_length=64, description="pseudonym")
    goal: str = Field(min_length=1, max_length=300)
    posts: list[RoomPostIn] = Field(default_factory=list, max_length=30)
    reply_language: Literal["fr", "en", "ar"] = "fr"


def build(
    settings: Settings, provider: PlatformProvider | None = None, *, room_tutor_permit: RoomTutorPermit | None = None,
) -> FastAPI:
    if room_tutor_permit is None and provider is None:
        room_tutor_permit = partial(verify_backend_permit, settings.room_tutor_permit_url)
    svc = build_service(settings, provider)
    orch, client, governor, rag = svc.orchestrator, svc.client, svc.governor, svc.rag
    learners, topics = svc.learners, svc.topics
    room_fair = FairShare(settings.learner_requests_per_min, settings.learner_burst)
    metrics, log = Metrics(), RequestLog(settings.request_log_path)
    app = FastAPI(title="EdNova LLM service")

    def route_kind(request) -> str:
        return request.url.path.strip("/").split("/")[0] or "root"

    @app.exception_handler(HTTPException)
    async def record_http_failure(request, exc):
        if exc.status_code >= 500:
            log.failure(route_kind(request), f"http_{exc.status_code}")
        return await http_exception_handler(request, exc)

    @app.exception_handler(Exception)
    async def record_crash(request, exc):
        if request.url.path == "/room/tutor":
            logger.error("room_tutor failed")
            log.failure("room_tutor", "internal_error")
            return JSONResponse({"detail": {"error": "internal_error"}}, status_code=500)
        logger.error("%s /%s failed", request.method, route_kind(request), exc_info=exc)
        log.failure(route_kind(request), "internal_error")
        return JSONResponse({"detail": {"error": "internal_error"}}, status_code=500)

    @app.exception_handler(RequestValidationError)
    async def validate_request(request, exc):
        if request.url.path == "/room/tutor":
            return JSONResponse({"detail": {"error": "invalid_room_tutor_request"}}, status_code=422)
        return await request_validation_exception_handler(request, exc)

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
                logger.exception("chat stream failed")
                log.failure("chat", "internal_error")
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
                "missing_points": [],
                "restate_prompt": "",
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
                "missing_points": [],
                "restate_prompt": "",
                "guiding_question": BUSY_GROUP[body.reply_language],
            }
        return done(
            {**result, "trace": trace.as_list(), "receipt": trace.receipt(), "capacity_level": governor.level.name},
            kind="group_check",
        )

    @app.post("/quiz")
    async def quiz(body: QuizRequest):
        learners.ensure_active(body.learner_id)
        if not topics.known(body.topic):
            raise HTTPException(404, detail={"error": "unknown_topic"})
        trace = Trace()
        search = SearchRequest(topics.label(body.topic), body.grade, body.section, body.subject, "fr", 4)
        tier, _ = orch.router.choose("quiz", RouteContext(governor.level))
        try:
            async with asyncio.timeout(settings.quiz_timeout_s):
                questions = await build_quiz(
                    body.topic,
                    search,
                    rag=rag,
                    client=client,
                    cache=orch.cache,
                    tier=tier,
                    trace=trace,
                    reply_language=body.reply_language,
                    fair=orch.fair,
                    learner_id=body.learner_id,
                )
        except NotInCourse as e:
            raise HTTPException(404, detail={"error": "not_in_course"}) from e
        except QuizUnavailable as e:
            raise HTTPException(503, detail={"retry_after": e.retry_after}) from e
        except CapacityUnavailable as e:
            raise HTTPException(503, detail={"retry_after": e.retry_after}) from e
        except TimeoutError as e:
            raise HTTPException(503, detail={"retry_after": 30}) from e
        return done(
            {
                "topic": body.topic,
                "questions": questions,
                "trace": trace.as_list(),
                "receipt": trace.receipt(),
                "capacity_level": governor.level.name,
            },
            kind="quiz",
        )

    @app.post("/mind-map")
    async def mind_map(body: MapRequest):
        learners.ensure_active(body.learner_id)
        trace = Trace()
        tier, _ = orch.router.choose("mind_map", RouteContext(governor.level, language=body.reply_language))
        try:
            async with asyncio.timeout(settings.quiz_timeout_s):
                artifact = await build_mind_map(
                    body, rag=rag, client=client, cache=orch.cache, fair=orch.fair, tier=tier, trace=trace,
                )
        except NotInCourse as exc:
            raise HTTPException(404, detail={"error": "not_in_course"}) from exc
        except InvalidMap as exc:
            raise HTTPException(502, detail={"error": "agent_error"}) from exc
        except CapacityUnavailable as exc:
            raise HTTPException(503, detail={"retry_after": exc.retry_after}) from exc
        except TimeoutError as exc:
            raise HTTPException(503, detail={"retry_after": 30}) from exc
        except RagUnavailable as exc:
            raise HTTPException(503, detail={"error": "agent_unavailable"}) from exc
        return done(
            {**artifact, "topic": body.topic, "trace": trace.as_list(), "receipt": trace.receipt(),
             "capacity_level": governor.level.name},
            kind="mind-map",
        )

    @app.post("/revision-pack")
    async def revision_pack(body: QuizRequest):
        learners.ensure_active(body.learner_id)
        if (body.topic, body.grade, body.section, body.subject) != (
            "derivabilite", "4eme_annee_secondaire", "sciences_experimentales", "math"
        ):
            raise HTTPException(404, detail={"error": "not_in_course"})
        trace = Trace()
        search = SearchRequest(
            "tangente coefficient directeur équation nombre dérivé", body.grade, body.section,
            body.subject, "fr", 4,
        )
        tier, _ = orch.router.choose("quiz", RouteContext(governor.level, language=body.reply_language))
        try:
            async with asyncio.timeout(settings.quiz_timeout_s):
                pack = await build_revision_pack(
                    search, rag=rag, client=client, cache=orch.cache, tier=tier, trace=trace,
                    reply_language=body.reply_language, fair=orch.fair, learner_id=body.learner_id,
                )
        except NotInCourse as exc:
            raise HTTPException(404, detail={"error": "not_in_course"}) from exc
        except CapacityUnavailable as exc:
            raise HTTPException(503, detail={"retry_after": exc.retry_after}) from exc
        except (TimeoutError, RevisionUnavailable) as exc:
            raise HTTPException(503, detail={"retry_after": 30}) from exc
        return done(
            {**pack, "trace": trace.as_list(), "receipt": trace.receipt(), "capacity_level": governor.level.name},
            kind="revision-pack",
        )

    async def room_step(step: str, learner_id: str, produce: Callable[[Tier, Trace], Awaitable]):
        learners.ensure_active(learner_id)
        trace = Trace()
        tier, _ = orch.router.choose(step, RouteContext(governor.level))
        try:
            async with asyncio.timeout(settings.request_timeout_s):
                value = await produce(tier, trace)
        except CapacityUnavailable as e:
            raise HTTPException(503, detail={"retry_after": e.retry_after}) from e
        except TimeoutError as e:
            raise HTTPException(503, detail={"retry_after": 30}) from e
        meta = {"trace": trace.as_list(), "receipt": trace.receipt(), "capacity_level": governor.level.name}
        return value, meta

    @app.post("/room/tutor")
    async def room_tutor(body: RoomTutorRequest):
        if not topics.known(body.topic):
            raise HTTPException(404, detail={"error": "unknown_topic"})
        concept_labels = room_concept_labels(body, topics)
        if concept_labels is None:
            raise HTTPException(422, detail={"error": "invalid_room_tutor_request"})
        trace = Trace()
        try:
            async with asyncio.timeout(settings.request_timeout_s):
                value = await tutor_room(
                    body, topics=topics, rag=rag, client=client, fair=room_fair, trace=trace,
                    compact_model=settings.compact_model, concept_labels=concept_labels, permit=room_tutor_permit,
                )
        except TimeoutError:
            trace.events.append("request_timeout")
            value = room_tutor_fallback(body)
        return done(
            {**value, "trace": trace.as_list(), "receipt": trace.receipt(), "capacity_level": governor.level.name},
            kind="room_tutor",
        )

    @app.post("/room/goal")
    async def room_goal(body: RoomGoalRequest):
        if not topics.known(body.topic):
            raise HTTPException(404, detail={"error": "unknown_topic"})
        goal, meta = await room_step(
            "room_goal",
            body.learner_id,
            lambda tier, trace: write_goal(
                topics.label(body.topic), body.reply_language,
                client=client, tier=tier, trace=trace, fair=orch.fair, learner_id=body.learner_id,
            ),
        )
        return done({"goal": goal, **meta}, kind="room_goal")

    @app.post("/room/prompt")
    async def room_prompt(body: RoomPromptRequest):
        goal, _ = redact(body.goal)
        recent = [redact(text)[0] for text in body.recent]
        question, meta = await room_step(
            "room_prompt",
            body.learner_id,
            lambda tier, trace: write_prompt(
                goal, recent, body.reply_language,
                client=client, tier=tier, trace=trace, fair=orch.fair, learner_id=body.learner_id,
            ),
        )
        return done({"question": question, **meta}, kind="room_prompt")

    @app.post("/room/notes")
    async def room_notes(body: RoomNotesRequest):
        goal, _ = redact(body.goal)
        posts = [{**p.model_dump(), "text": redact(p.text)[0]} for p in body.posts]
        notes, meta = await room_step(
            "room_notes",
            body.learner_id,
            lambda tier, trace: write_notes(
                goal, posts, body.reply_language,
                client=client, tier=tier, trace=trace, fair=orch.fair, learner_id=body.learner_id,
            ),
        )
        return done({"notes": notes, **meta}, kind="room_notes")

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
                "diagnostic_score": profile.diagnostic_score,
                "diagnostic_score_max": len(diagnostic.BANK["level_check"])}

    def mistake_counts(mistakes: list[dict]) -> list[dict]:
        groups: dict[tuple[str, str], dict] = {}
        for m in mistakes:
            row = groups.setdefault(
                (m["topic"], m["type"]),
                {"topic": m["topic"], "label": topics.label(m["topic"]), "type": m["type"], "count": 0, "ts": 0.0},
            )
            row["count"] += 1
            row["ts"] = max(row["ts"], m["ts"])
        return sorted(groups.values(), key=lambda r: r["ts"], reverse=True)

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
            "mistakes": mistake_counts(p.mistakes),
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
