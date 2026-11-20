import asyncio
import time
from collections import OrderedDict, defaultdict
from contextvars import ContextVar
from typing import Awaitable, Callable, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from app.agent.evidence import LOW, Verdict, judge
from app.agent.limits import Limits
from app.agent.tools import Chunk, RagUnavailable, SearchRequest
from app.agent.triage import Action, Triage, triage
from app.cache.store import CacheStore, evidence_key, exact_key, ladder_key
from app.capacity.fairness import FairShare
from app.capacity.governor import CapacityGovernor, Level
from app.capacity.resilient import CapacityUnavailable, ResilientClient
from app.pedagogy.confusion import is_confused, wants_hint
from app.pedagogy.generator import MAX_TOKENS, build_messages, evidence_keys, shrink
from app.pedagogy.hint_ladder import compile_ladder, grade_attempt
from app.pedagogy.next_step import recommend
from app.pedagogy.topics import UNKNOWN, TopicGraph
from app.providers.platform import CeilingExceeded, Tier
from app.routing.router import ModelRouter, RouteContext
from app.safety.privacy import is_distress, redact, wellbeing_message
from app.sessions import Ladder, LearnerStore, Profile, Session, SessionStore, TopicStats
from app.trace import DEGRADED_EVENTS, NO_CACHE_EVENTS, Badge, Trace
from app.validation.validator import (
    check_answer,
    matches_answer,
    resolve_keys,
    strip_invented,
    strip_prompt_echo,
    supporting_chunk,
)

Stage = Callable[[str], Awaitable[None]]
# Monotonic instant by which the request must be answered; stages read it to skip work that cannot finish.
_deadline: ContextVar[float | None] = ContextVar("request_deadline", default=None)
REPAIR_SLACK_S = 3.0  # time kept back for the excerpt fallback when deciding whether a repair call can finish
TEXT = {
    "fr": {
        "busy": "Le service est très demandé en ce moment.",
        "retry": "Réessaie dans {s} s, ta question n'est pas perdue.",
        "excerpt": "En attendant, voici ce que dit ton cours :",
        "unchecked": "Je n'ai pas pu rédiger une explication fiable. Voici ce que dit ton cours :",
        "too_fast": "Tu enchaînes vite ! Relis la réponse précédente, et réessaie dans {s} s.",
        "bravo": "Bravo, c'est juste !",
    },
    "en": {
        "busy": "The service is very busy right now.",
        "retry": "Try again in {s} s, your question is not lost.",
        "excerpt": "Meanwhile, here is what your course says:",
        "unchecked": "I couldn't write a reliable explanation. Here is what your course says:",
        "too_fast": "You're going fast! Re-read the previous answer and try again in {s} s.",
        "bravo": "Well done, that's right!",
    },
    "ar": {
        "busy": "الخدمة مطلوبة بكثرة في الوقت الحالي.",
        "retry": "أعد المحاولة بعد {s} ثانية، فسؤالك لم يضِع.",
        "excerpt": "في انتظار ذلك، هذا ما يقوله درسك:",
        "unchecked": "لم أتمكن من كتابة شرح موثوق. هذا ما يقوله درسك:",
        "too_fast": "أنت سريع جدًا! أعد قراءة الإجابة السابقة وحاول مجددًا بعد {s} ثانية.",
        "bravo": "أحسنت، إجابتك صحيحة!",
    },
}
NEW_EXERCISE = {"fr": "Choisis un nouvel exercice.", "en": "Choose a new exercise.", "ar": "اختر تمرينًا جديدًا."}
CANNOT_VERIFY = {
    "fr": "Je n'ai pas pu vérifier. Peux-tu reformuler ta réponse ?",
    "en": "I couldn't verify this. Can you rephrase your answer?",
    "ar": "لم أتمكن من التحقق. هل يمكنك إعادة صياغة إجابتك؟",
}


def repair_request(problems: list[str], allowed: list[str]) -> str:
    """Spells the validator's problem codes out: a bare code like "missing_citation" reads as a new task."""
    example = f"[[{allowed[0]}]]" if allowed else "[[identifiant]]"
    fixes = {
        "missing_citation": f"cite au moins un extrait du cours avec son identifiant entre doubles crochets, "
                            f"par exemple {example}",
        "invented_citations": "retire les identifiants qui ne figurent pas dans les extraits fournis",
        "empty": "ta réponse était vide : écris-la",
        "wrong_language": "réponds dans la langue demandée",
        "foreign_script": "écris uniquement dans la langue demandée, sans caractères d'une autre écriture",
    }
    asked = [fixes.get(p.split(":")[0], p) for p in problems]
    return ("Réécris ta réponse précédente à l'élève en corrigeant ceci : " + " ; ".join(asked)
            + ". Donne uniquement la réponse corrigée, sans commentaire.")


async def _no_stage(_: str) -> None:
    return None


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    learner_id: str | None = Field(default=None, max_length=64, description="pseudonym, never a real name")
    message: str = Field(min_length=1, max_length=2000)
    mode: Literal["explain", "guided"] = "explain"
    action: Literal["auto", "hint", "attempt", "new_question"] = "auto"
    level: str = Field(default="bac_math", pattern=r"^[a-z0-9_]{1,40}$")
    grade: str = Field(default="4eme_annee_secondaire", pattern=r"^[a-z0-9_]{1,40}$")
    section: str = Field(default="mathematiques", pattern=r"^[a-z0-9_]{1,40}$")
    subject: str = Field(default="math", pattern=r"^[a-z0-9_]{1,40}$")
    subject_selected: bool = False
    reply_language: Literal["fr", "en", "ar"] = "fr"
    preferred_style: Literal["visual", "step_by_step"] | None = None

    @property
    def learner(self) -> str:
        return self.learner_id or self.session_id

    @property
    def cache_subject(self) -> str:
        return f"selected:{self.subject}" if self.subject_selected else self.subject


class Orchestrator:
    def __init__(
        self,
        client: ResilientClient,
        governor: CapacityGovernor,
        rag,
        cache: CacheStore,
        router: ModelRouter,
        sessions: SessionStore,
        learners: LearnerStore,
        topics: TopicGraph,
        fair: FairShare | None = None,
        wellbeing_contact: str = "",
        agentic: bool = True,
        request_timeout_s: float = 45.0,
        fallback_timeout_s: float = 5.0,
    ):
        self.client, self.governor, self.rag = client, governor, rag
        self.cache, self.router, self.sessions = cache, router, sessions
        self.learners, self.topics, self.fair = learners, topics, fair
        self.wellbeing_contact = wellbeing_contact
        self.agentic = agentic  # False = classic RAG baseline for the A/B/C benchmark
        self.response_keys: OrderedDict[str, list[str]] = OrderedDict()
        self.learner_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self.request_timeout_s = request_timeout_s
        self.fallback_timeout_s = fallback_timeout_s

    # ---- entry point -------------------------------------------------------------------------
    async def handle(self, req: ChatRequest, stage: Stage = _no_stage) -> dict:
        trace = Trace()
        self.learners.ensure_active(req.learner)
        if is_distress(req.message):
            return await self._handle_request(req, stage, trace)
        started = time.monotonic()
        _deadline.set(started + self.request_timeout_s)
        lock_wait = 0.0
        try:
            async with asyncio.timeout(self.request_timeout_s):
                async with self.learner_locks[req.learner]:
                    lock_wait = time.monotonic() - started
                    self.learners.ensure_active(req.learner)
                    return await self._handle_request(req, stage, trace)
        except TimeoutError:
            self.learners.ensure_active(req.learner)
            trace.events.append("request_timeout")
            # The lock wait counts against the budget: a queued second message can time out early.
            trace.rule(
                "request_timeout", elapsed_s=round(time.monotonic() - started, 1), lock_wait_s=round(lock_wait, 1),
                llm_calls=sum(1 for s in trace.steps if s.tier),
            )
            message, _ = redact(req.message)
            try:
                async with asyncio.timeout(self.fallback_timeout_s):
                    result = await self._excerpt_or_wait(req, message, 5, trace)
            except TimeoutError:
                t = TEXT[req.reply_language]
                result = {
                    "answer": f"{t['busy']} {t['retry'].format(s=5)}",
                    "badge": None,
                    "sources": [],
                    "retry_after": 5,
                }
            self.learners.ensure_active(req.learner)
            self._remember_turn(req, message, result["answer"])
            return self._finish(req, result, trace, [])

    async def purge(self, learner_id: str, session_ids: list[str]) -> None:
        async with self.learner_locks[learner_id]:
            self.learners.delete(learner_id)
            self.sessions.discard(session_ids)

    async def _handle_request(self, req: ChatRequest, stage: Stage, trace: Trace) -> dict:
        keys: list[str] = []
        if is_distress(req.message):
            trace.rule("wellbeing")
            result = {
                "answer": wellbeing_message(req.reply_language, self.wellbeing_contact),
                "badge": "wellbeing",
                "sources": [],
            }
        else:
            session = self.sessions.get(req.session_id)
            profile = self.learners.get(req.learner)
            message, removed = redact(req.message)
            if removed:
                trace.rule("redacted", kinds=removed)
            try:
                result = await self._handle(req, message, session, profile, trace, stage, keys)
            except CapacityUnavailable as e:
                trace.events.append("capacity_unavailable")
                result = await self._excerpt_or_wait(req, message, e.retry_after, trace)
            except CeilingExceeded:
                trace.events.append("ceiling_exceeded")
                result = await self._excerpt_or_wait(req, message, 0, trace)
            self._remember_turn(req, message, result["answer"], session)
        return self._finish(req, result, trace, keys)

    def _remember_turn(self, req: ChatRequest, message: str, answer: str, session: Session | None = None) -> None:
        """Keeps the exchange even when the answer is degraded, so the conversation can continue."""
        session = session or self.sessions.get(req.session_id)
        session.history.append(("élève", message))
        session.history.append(("ednova", answer))
        self.learners.save(req.learner)
        if hasattr(self.sessions, "save"):
            self.sessions.save(req.session_id, session)

    def _finish(self, req: ChatRequest, result: dict, trace: Trace, keys: list[str]) -> dict:
        response_id = uuid4().hex
        self._remember(response_id, keys)
        result.setdefault("next_step", None)
        result.setdefault("topic", None)
        return {
            **result,
            "response_id": response_id,
            "mode": req.mode,
            "capacity_level": self.governor.level.name,
            "degraded": _degraded(trace),
            "trace": trace.as_list(),
            "receipt": trace.receipt(),
        }

    def feedback(self, response_id: str, helpful: bool) -> int:
        """A thumbs-down removes every cache entry that produced or stored this answer."""
        if helpful:
            return 0
        keys = self.response_keys.pop(response_id, [])
        self.sessions.invalidate_ladders(keys)
        return self.cache.delete(keys)

    # ---- main path ---------------------------------------------------------------------------
    async def _handle(self, req, message, session: Session, profile: Profile, trace, stage, keys) -> dict:
        if req.mode == "guided" and session.ladder and self._is_ladder_turn(req, message):
            if session.ladder_key:
                keys.append(session.ladder_key)
            return await self._continue_ladder(req, message, session, profile, trace)
        if req.mode == "guided" and req.action == "attempt" and session.ladder is None:
            return {
                "answer": NEW_EXERCISE[req.reply_language],
                "badge": Badge.CLARIFY.value,
                "sources": [],
            }
        session.ladder = None  # a new question ends any open exercise
        session.ladder_key = None
        style = req.preferred_style or profile.style
        xkey = exact_key(
            message,
            req.mode,
            req.level,
            req.reply_language,
            style,
            grade=req.grade,
            section=req.section,
            subject=req.cache_subject,
        )
        if (hit := self.cache.get(xkey)) is not None:
            trace.cache = "exact"
            keys.extend(hit.pop("_aliases", [xkey]))
            return self._with_next_step(hit, "answered", req, session, profile)
        if self.governor.level is Level.OFFLINE:
            raise CapacityUnavailable(max(1.0, self.governor.offline_until - self.governor.clock()))
        if self.fair and (wait := self.fair.take(req.learner)) > 0:
            trace.events.append("fair_share_wait")
            return {
                "answer": TEXT[req.reply_language]["too_fast"].format(s=int(wait) + 1),
                "badge": None,
                "sources": [],
                "retry_after": wait,
            }

        await stage("understanding")
        if self.agentic:
            t = await triage(
                message, session.summary(), req.level, self.client, trace, self.topics,
                subject=req.subject if req.subject_selected else None,
            )
        else:
            t = Triage(action=Action.SEARCH_COURSE, queries=[message], difficulty=3)
        if req.subject_selected:
            t.subject = req.subject
            if req.subject != "math":
                # The current topic graph and mastery counters only represent mathematics.
                t.topic, t.subtopic = UNKNOWN, None
        session.topic_asks[t.topic] += 1
        if t.confused:
            if session.last_style:
                profile.penalize(session.last_style)
            self._stats(profile, t.topic).confusions += 1
            if self.topics.valid_subtopic(t.subtopic, t.topic):
                profile.subtopic(t.subtopic).confusions += 1
        event = "confused" if t.confused else "answered"

        if t.action is Action.ASK_CLARIFICATION:
            result = await self._write("clarify", req, message, session, profile, t, [], Badge.CLARIFY, trace, stage)
        elif t.action is Action.DIRECT_ANSWER:
            result = await self._write(
                "direct_answer", req, message, session, profile, t, [], Badge.GENERAL, trace, stage
            )
        else:
            await stage("searching")
            try:
                verdict, chunks = await self._retrieve(req, message, t, self.governor.level, trace)
            except RagUnavailable:
                trace.events.append("rag_unavailable")
                verdict, chunks = None, []
            if verdict is None:
                result = await self._write(
                    "direct_answer", req, message, session, profile, t, [], Badge.GENERAL, trace, stage
                )
            elif verdict is Verdict.INSUFFICIENT:
                result = await self._write(
                    "not_found", req, message, session, profile, t, [], Badge.NOT_FOUND, trace, stage
                )
            else:
                if req.mode == "guided":
                    return await self._start_ladder(
                        req, message, session, profile, t, chunks, verdict, trace, stage, keys
                    )
                cacheable = t.standalone and t.topic != UNKNOWN
                ekey = evidence_key(
                    t.action.value,
                    t.topic,
                    req.mode,
                    req.level,
                    req.reply_language,
                    style,
                    [c.chunk_id for c in chunks],
                    message,
                    grade=req.grade,
                    section=req.section,
                    subject=req.cache_subject,
                )
                if cacheable and (hit := self.cache.get(ekey)) is not None:
                    trace.cache = "evidence"
                    keys.extend(hit.pop("_aliases", [ekey]))
                    return self._with_next_step(hit, event, req, session, profile)
                task = (
                    "multi_search"
                    if t.action is Action.MULTI_SEARCH
                    else "explanation_confused"
                    if t.confused
                    else "explanation"
                )
                result = await self._write(
                    task, req, message, session, profile, t, chunks, Badge.COURSE, trace, stage, evidence=verdict
                )
                if cacheable and result["badge"] == Badge.COURSE.value and NO_CACHE_EVENTS.isdisjoint(trace.events):
                    keys.append(ekey)
        if t.standalone and NO_CACHE_EVENTS.isdisjoint(trace.events):
            keys.append(xkey)
            for key in keys:
                self.cache.put(key, {**result, "_aliases": keys})
        return self._with_next_step(result, event, req, session, profile)

    async def _retrieve(self, req, message, t: Triage, level: Level, trace: Trace):
        limits = Limits.for_level(level)
        tool = "search_exercises" if (t.action is Action.SEARCH_EXERCISES or req.mode == "guided") else "search_courses"
        queries = t.queries[:2] if t.action is Action.MULTI_SEARCH else t.queries[:1]
        chunks: dict[str, Chunk] = {}

        async def search(tool_name: str, query: str) -> None:
            limits.tool_calls += 1
            found = await self.rag.search(
                tool_name, SearchRequest(query, req.grade, req.section, t.subject, "fr", limits.chunks_per_search)
            )
            trace.rule("tool", tool=tool_name, query=query, ids=[c.chunk_id for c in found])
            for c in found:
                chunks.setdefault(c.chunk_id, c)

        for q in queries:
            if limits.can_search():
                await search(tool, q)
        limits.rounds += 1
        ranked = sorted(chunks.values(), key=lambda c: -c.score)[: limits.max_chunks]
        verdict, kept = await judge(message, ranked, level, self.client, trace)
        if verdict is Verdict.PARTIAL and limits.can_search():
            broader = self.topics.label(t.topic) if t.topic != UNKNOWN else queries[0]
            await search("search_definitions", broader)
            limits.rounds += 1
            ranked = sorted(chunks.values(), key=lambda c: -c.score)[: limits.max_chunks]
            verdict, kept = await judge(message, ranked, level, self.client, trace)
        return verdict, kept

    async def _write(
        self,
        task,
        req,
        message,
        session,
        profile,
        t: Triage,
        chunks: list[Chunk],
        badge: Badge,
        trace,
        stage,
        evidence: Verdict = Verdict.SUFFICIENT,
    ) -> dict:
        await stage("writing")
        step = {
            "clarify": "clarify",
            "direct_answer": "direct_answer",
            "not_found": "direct_answer",
            "multi_search": "multi_search_answer",
        }.get(task, "answer")
        ctx = RouteContext(
            self.governor.level, t.action.value, t.difficulty, t.needs_reasoning, t.language, evidence.value
        )
        tier, reason = self.router.choose(step, ctx)
        style = req.preferred_style or profile.style
        messages = build_messages(
            task,
            message,
            level=req.level,
            reply_language=req.reply_language,
            style=style,
            chunks=chunks,
            history_summary=session.summary(),
            subject=req.subject if req.subject_selected else None,
            short_keys=badge is Badge.COURSE,
            language_reminder=True,
        )
        result = await self.client.call(tier, messages, MAX_TOKENS[task], shrink=shrink)
        trace.llm(task, result, route=reason)
        first_call_s, first_tier = result.completion.latency_ms / 1000, result.completion.tier
        text = result.completion.text
        allowed = {c.chunk_id for c in chunks}
        if badge is Badge.COURSE:
            await stage("verifying")
            keys = evidence_keys(chunks)
            resolved = resolve_keys(strip_prompt_echo(text), keys)
            seen = [
                p.split(":")[0] if p.startswith("invented") else p
                for p in check_answer(resolved, allowed, req.reply_language, require_citation=True).problems
            ]
            draft = strip_invented(resolved, allowed)
            check = check_answer(draft, allowed, req.reply_language, require_citation=True)
            blocking = [p for p in check.problems if p != "missing_citation"]
            if blocking:
                trace.rule("validation", stage="first_draft", problems=seen)
                repair_tier, _ = self.router.choose("repair", ctx)
                repair_tier = self._affordable_repair(repair_tier, first_tier, first_call_s)
                if repair_tier is None:
                    # A repair would finish after the deadline: answer now with the passage itself.
                    trace.events.append("repair_skipped_budget")
                    return self._unchecked_excerpt(req, t, chunks)
                fix = messages + [
                    {"role": "assistant", "content": text},
                    {"role": "user", "content": repair_request(blocking, list(keys.values()))},
                ]
                result = await self.client.call(repair_tier, fix, MAX_TOKENS[task], shrink=shrink)
                trace.llm("repair", result, problems=[p.split(":")[0] for p in seen])
                draft = strip_invented(resolve_keys(strip_prompt_echo(result.completion.text), keys), allowed)
                check = check_answer(draft, allowed, req.reply_language, require_citation=True)
                if any(p != "missing_citation" for p in check.problems):
                    trace.rule("validation", stage="after_repair", problems=check.problems)
                    # A second bad draft is not shown: the retrieved passage itself is a sound answer.
                    trace.events.append("repair_failed")
                    return self._unchecked_excerpt(req, t, chunks)
            text = draft
            cited = set(check.citations)
            if not cited:
                # Small models rarely cite. Name the excerpt the answer shares most wording with; with none, the
                # answer is still useful but is not presented as coming from the course.
                support = supporting_chunk(text, {c.chunk_id: c.content for c in chunks})
                if support:
                    trace.events.append("citation_inferred")
                    cited = {support}
                else:
                    trace.events.append("uncited_answer")
                    badge = Badge.GENERAL
        else:
            text, cited = strip_invented(text, set()), set()
        session.last_style = style
        sources = [{"chunk_id": c.chunk_id, "source": c.source, "page": c.page} for c in chunks if c.chunk_id in cited]
        return {"answer": text, "badge": badge.value, "sources": sources, "topic": t.topic}

    # ---- guided mode -------------------------------------------------------------------------
    @staticmethod
    def _is_ladder_turn(req: ChatRequest, message: str) -> bool:
        if req.action in ("hint", "attempt"):
            return True
        if req.action == "new_question":
            return False
        if wants_hint(message) or is_confused(message):
            return True
        return not (message.rstrip().endswith("?") and len(message.split()) >= 5)

    async def _start_ladder(self, req, message, session, profile, t, chunks, verdict, trace, stage, keys) -> dict:
        await stage("writing")
        style = req.preferred_style or profile.style
        lkey = ladder_key(
            message,
            req.level,
            req.reply_language,
            style,
            grade=req.grade,
            section=req.section,
            subject=req.cache_subject,
            chunk_ids=[c.chunk_id for c in chunks],
        )
        if (cached := self.cache.get(lkey)) is not None:
            trace.cache = "artifact"
            session.ladder = Ladder(cached["final_answer"], cached["rungs"], t.topic)
        else:
            tier, _ = self.router.choose("hint_ladder", RouteContext(self.governor.level))
            session.ladder = await compile_ladder(
                message,
                chunks,
                tier,
                topic=t.topic,
                level=req.level,
                reply_language=req.reply_language,
                style=style,
                client=self.client,
                trace=trace,
                subject=req.subject if req.subject_selected else None,
            )
            if session.ladder is None:
                result = await self._write(
                    "explanation", req, message, session, profile, t, chunks, Badge.COURSE, trace, stage, verdict
                )
                return self._with_next_step(result, "answered", req, session, profile)
            if NO_CACHE_EVENTS.isdisjoint(trace.events):
                self.cache.put(lkey, {"final_answer": session.ladder.final_answer, "rungs": session.ladder.rungs})
        keys.append(lkey)
        session.ladder.subtopic = t.subtopic
        session.ladder_key = lkey
        i, rung = session.ladder.take()
        sources = [{"chunk_id": c.chunk_id, "source": c.source, "page": c.page} for c in chunks]
        return {"answer": rung, "badge": Badge.COURSE.value, "sources": sources, "hint_rung": i, "topic": t.topic}

    async def _continue_ladder(self, req, message, session: Session, profile: Profile, trace) -> dict:
        attempt_result = None
        ladder = session.ladder
        stats = self._stats(profile, ladder.topic)
        child = profile.subtopic(ladder.subtopic) if self.topics.valid_subtopic(ladder.subtopic, ladder.topic) else None
        lang = req.reply_language
        if req.action == "hint" or (req.action == "auto" and (wants_hint(message) or is_confused(message))):
            trace.cache = "artifact"
            # The last rung is the full solution; a hint request must keep the exercise open.
            ladder.next = min(ladder.next, len(ladder.rungs) - 2)
            i, rung = ladder.take()
        else:
            if self.fair and not matches_answer(message, ladder.final_answer):
                wait = self.fair.take(req.learner)
                if wait > 0:
                    trace.events.append("fair_share_wait")
                    return {
                        "answer": TEXT[lang]["too_fast"].format(s=int(wait) + 1),
                        "badge": None,
                        "sources": [],
                        "retry_after": wait,
                    }
            correct, feedback, mistake_type = await grade_attempt(message, ladder, self.client, trace)
            if correct is None:
                question = CANNOT_VERIFY[lang]
                return {"answer": question, "badge": Badge.CLARIFY.value, "sources": [], "topic": ladder.topic,
                        "hint_rung": max(0, min(2, ladder.next - 1)),
                        "attempt_result": {"verdict": "unknown", "issue": "",
                                           "guiding_question": question, "source": None}}
            attempt_result = {"verdict": "correct" if correct else "incorrect", "issue": feedback,
                              "guiding_question": feedback, "source": None}
            if not correct:
                attempt_result["mistake_type"] = mistake_type
                if mistake_type:
                    profile.record_mistake(ladder.topic, ladder.subtopic, mistake_type)
            if correct:
                stats.attempts += 1
                stats.solved += 1
                stats.hints_used += ladder.hints_used
                if child is not None:
                    child.attempts += 1
                    child.solved += 1
                    child.hints_used += ladder.hints_used
                session.ladder = None
                result = {
                    "answer": TEXT[lang]["bravo"],
                    "badge": Badge.COURSE.value,
                    "sources": [],
                    "hint_rung": None,
                    "attempt_result": attempt_result,
                    "topic": ladder.topic,
                }
                return self._with_next_step(result, "solved", req, session, profile, ladder.hints_used)
            i, rung = ladder.take()
            rung = f"{feedback} {rung}".strip()
        result = {"answer": rung, "badge": Badge.COURSE.value, "sources": [], "hint_rung": i, "topic": ladder.topic}
        if attempt_result is not None:
            attempt_result["guiding_question"] = rung
            result["attempt_result"] = attempt_result
        if ladder.done:  # the full solution has been shown
            stats.attempts += 1
            stats.hints_used += ladder.hints_used
            if child is not None:
                child.attempts += 1
                child.hints_used += ladder.hints_used
            session.ladder = None
            return self._with_next_step(result, "answered", req, session, profile)
        return result

    # ---- helpers -----------------------------------------------------------------------------
    @staticmethod
    def _affordable_repair(preferred: Tier, first_tier: Tier, first_call_s: float) -> Tier | None:
        """The tier whose repair call should still finish before the deadline, or None.

        The mid model measured about twice as slow as the compact one, so a mid repair after a compact draft
        is costed at 2.5x the draft; the compact model is the cheaper retry when time is short.
        """
        deadline = _deadline.get()
        if deadline is None:
            return preferred
        left = deadline - time.monotonic() - REPAIR_SLACK_S
        for tier in dict.fromkeys([preferred, Tier.COMPACT]):
            slowdown = 1.25 if tier is first_tier else 2.5 if tier is Tier.MID else 1.0
            if left > first_call_s * slowdown:
                return tier
        return None

    @staticmethod
    def _unchecked_excerpt(req: ChatRequest, t: Triage, chunks: list[Chunk]) -> dict:
        c = max(chunks, key=lambda chunk: chunk.score)
        return {
            "answer": f"{TEXT[req.reply_language]['unchecked']}\n\n> {c.content}\n\n({c.source}, p. {c.page})",
            "badge": "course_excerpt",
            "sources": [{"chunk_id": c.chunk_id, "source": c.source, "page": c.page}],
            "topic": t.topic,
        }

    async def _excerpt_or_wait(self, req: ChatRequest, message: str, retry_after: float, trace: Trace) -> dict:
        """No model available: still teach, by showing the course passage itself (retrieval has its own quota)."""
        t = TEXT[req.reply_language]
        wait = int(retry_after) + 1
        try:
            found = await self.rag.search(
                "search_courses", SearchRequest(message, req.grade, req.section, req.subject, "fr", 1)
            )
        except RagUnavailable:
            found = []
        if found and found[0].score >= LOW:
            c = found[0]
            trace.events.append("excerpt_only")
            answer = (
                f"{t['busy']} {t['excerpt']}\n\n> {c.content}\n\n({c.source}, p. {c.page}) {t['retry'].format(s=wait)}"
            )
            return {
                "answer": answer,
                "badge": "course_excerpt",
                "retry_after": retry_after,
                "topic": c.topic or None,
                "sources": [{"chunk_id": c.chunk_id, "source": c.source, "page": c.page}],
            }
        return {
            "answer": f"{t['busy']} {t['retry'].format(s=wait)}",
            "badge": None,
            "sources": [],
            "retry_after": retry_after,
        }

    def _with_next_step(
        self, result: dict, event, req, session: Session, profile: Profile, hints_used: int = 0
    ) -> dict:
        topic = result.get("topic") or UNKNOWN
        step = recommend(
            topic,
            event,
            profile,
            self.topics,
            req.reply_language,
            hints_used=hints_used,
            asks_this_session=session.topic_asks[topic],
        )
        return {**result, "next_step": step}

    def _stats(self, profile: Profile, topic: str) -> TopicStats:
        return profile.topic(topic) if self.topics.known(topic) else TopicStats()

    def _remember(self, response_id: str, keys: list[str]) -> None:
        self.response_keys[response_id] = keys
        while len(self.response_keys) > 5000:
            self.response_keys.popitem(last=False)


def _degraded(trace: Trace) -> bool:
    return bool(DEGRADED_EVENTS & set(trace.events))
