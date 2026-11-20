from typing import Annotated
from fastapi import APIRouter, HTTPException, Path
from pydantic import ValidationError
from ..ai.interface import Agent
from ..auth.services import CurrentUser
from ..Database.core import DbSession
from ..groups import group_memory
from ..groups.access import require_group_pro
from ..student_plans import require_pro
from ..tutor.services import create_session
from ..utils import learner_pseudonym
from . import quizzes, services
from .bac_practice import bac_practice
from .course_lab import course_activity
from .interactive_lab import lab_activity
from .sample_quiz import sample_quiz
from .schemas import (
    CourseLabActivity, DiagnosticSubmit, GroupReview, LabActivity, MistakePracticeIn, MistakePracticeOut, ProfileOut,
    ProfileUpdate, QuizAnswers, QuizGrade, QuizOut, RevisionPack, TimedQuizOut,
)
from ..contracts import DiagnosticBank, DiagnosticResult, ProgressResult
from ..contracts import TopicCatalog

router = APIRouter(tags=["learning"])

@router.get("/topics", response_model=TopicCatalog, response_model_exclude_unset=True)
async def topic_catalog(user: CurrentUser, agent: Agent):
    return await agent.topics()

@router.get("/me/profile", response_model=ProfileOut)
def get_profile(user: CurrentUser, db: DbSession):
    return services.get_or_create_profile(db, user)

@router.post("/me/pro-request", response_model=ProfileOut)
def request_pro(user: CurrentUser, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    db.refresh(profile, with_for_update=True)
    if profile.student_plan == "free":
        profile.pro_requested = True
    db.commit()
    return profile


@router.delete("/me/pro-request", status_code=204)
def cancel_pro_request(user: CurrentUser, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    db.refresh(profile, with_for_update=True)
    if not profile.pro_requested:
        raise HTTPException(status_code=404, detail="No pending Pro request")
    profile.pro_requested = False
    db.commit()


@router.put("/me/profile", response_model=ProfileOut)
def put_profile(data: ProfileUpdate, user: CurrentUser, db: DbSession):
    return services.update_profile(db, user, data)

@router.get("/learning/diagnostic", response_model=DiagnosticBank)
async def diagnostic_items(user: CurrentUser, agent: Agent):
    return await agent.diagnostic_items()

@router.post("/learning/diagnostic", response_model=DiagnosticResult, response_model_exclude_unset=True)
async def diagnostic_submit(data: DiagnosticSubmit, user: CurrentUser, agent: Agent, db: DbSession):
    result = await agent.diagnostic_submit(learner_pseudonym(user.id), data.answers)
    score = result.get("diagnostic_score")
    if type(score) is int and 0 <= score <= 3 and result.get("diagnostic_score_max") == 3:
        profile = services.get_or_create_profile(db, user)
        profile.diagnostic_score = score
        db.commit()
    return result

@router.get("/learning/progress", response_model=ProgressResult, response_model_exclude_unset=True)
async def progress(user: CurrentUser, agent: Agent, db: DbSession):
    result = await agent.progress(learner_pseudonym(user.id))
    if services.student_plan_for(db, user.id) == "pro":
        review = group_memory.private_review(db, user.id)
        if review:
            result["group_review"] = GroupReview(items=review).items
    return result


@router.get("/learning/group-review", response_model=GroupReview)
def group_review(user: CurrentUser, db: DbSession):
    require_group_pro(db, user.id)
    return {"items": group_memory.private_review(db, user.id)}

@router.get("/learning/quiz/{topic}", response_model=QuizOut)
async def start_quiz(
    topic: Annotated[str, Path(pattern=r"^[a-z0-9_]{1,40}$")], user: CurrentUser, agent: Agent, db: DbSession
):
    profile = services.get_or_create_profile(db, user)
    require_pro(profile.student_plan, "personal_quiz")
    return await quizzes.generate(agent, db, user.id, profile, topic)


@router.get("/learning/sample-quiz", response_model=QuizOut)
def start_sample_quiz(user: CurrentUser, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    return quizzes.issue(db, user.id, sample_quiz(profile.reply_language))


@router.post("/learning/revision-pack/derivabilite", response_model=RevisionPack)
async def start_revision_pack(user: CurrentUser, agent: Agent, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    require_pro(profile.student_plan, "revision_pack")
    if profile.grade != "4eme_annee_secondaire" or profile.section != "sciences_experimentales":
        raise HTTPException(404, detail={"error": "not_in_course"})
    body = await agent.revision_pack({
        "learner_id": learner_pseudonym(user.id),
        "topic": "derivabilite",
        "grade": profile.grade,
        "section": profile.section,
        "subject": "math",
        "reply_language": profile.reply_language,
    })
    try:
        return RevisionPack.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(502, detail={"error": "agent_error"}) from exc


@router.post("/learning/revision-demo/completion", status_code=204)
def revision_demo_completed(user: CurrentUser):
    # The access log records the countable event. It receives no answer or learner identifier.
    return None


@router.get("/learning/interactive-lab/{topic}", response_model=LabActivity | CourseLabActivity)
def open_interactive_lab(
    topic: Annotated[str, Path(pattern=r"^[a-z0-9_]{1,40}$")], user: CurrentUser, db: DbSession
):
    profile = services.get_or_create_profile(db, user)
    require_pro(profile.student_plan, "interactive_lab")
    activity = lab_activity(topic, profile.reply_language) or course_activity(topic, profile.reply_language)
    if activity is None:
        raise HTTPException(404, detail={"error": "lab_not_found"})
    return activity


@router.get("/learning/bac-practice/derivabilite", response_model=TimedQuizOut)
def start_bac_practice(user: CurrentUser, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    require_pro(profile.student_plan, "bac_practice")
    quiz = quizzes.issue(db, user.id, bac_practice(profile.reply_language))
    return TimedQuizOut(**quiz.model_dump())


@router.post("/learning/mistake-practice", response_model=MistakePracticeOut, status_code=201)
async def start_mistake_practice(data: MistakePracticeIn, user: CurrentUser, agent: Agent, db: DbSession):
    profile = services.get_or_create_profile(db, user)
    require_pro(profile.student_plan, "mistake_practice")
    if data.topic == "autre":
        raise HTTPException(404, detail={"error": "mistake_not_found"})
    progress = await agent.progress(learner_pseudonym(user.id))
    for mistake in progress.get("mistakes", []):
        if (mistake.get("topic"), mistake.get("type")) == (data.topic, data.type):
            message = services.mistake_prompt(profile.reply_language, mistake, data)
            session = create_session(db, user, "math")
            return MistakePracticeOut(session_id=session.id, message=message)
    raise HTTPException(404, detail={"error": "mistake_not_found"})


@router.post("/learning/quiz/{quiz_id}/answers", response_model=QuizGrade)
def grade_quiz(quiz_id: str, data: QuizAnswers, user: CurrentUser, db: DbSession):
    quiz = quizzes.get(db, quiz_id, user.id)
    if quiz is None:
        raise HTTPException(404, {"error": "quiz_not_found"})
    results = [
        {
            "id": q["id"],
            "correct": data.answers.get(q["id"]) == q["answer_index"],
            "answer_index": q["answer_index"],
            "explanation": q["explanation"],
            "source": q["source"],
        }
        for q in quiz["questions"]
    ]
    return {"score": sum(r["correct"] for r in results), "total": len(results), "results": results}
