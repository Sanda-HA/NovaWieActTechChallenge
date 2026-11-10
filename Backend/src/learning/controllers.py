from fastapi import APIRouter
from ..ai.interface import Agent
from ..auth.services import CurrentUser
from ..Database.core import DbSession
from ..utils import learner_pseudonym
from . import services
from .schemas import DiagnosticSubmit, ProfileOut, ProfileUpdate
from ..contracts import DiagnosticBank, DiagnosticResult, ProgressResult
from ..contracts import TopicCatalog

router = APIRouter(tags=["learning"])

@router.get("/topics", response_model=TopicCatalog, response_model_exclude_unset=True)
async def topic_catalog(user: CurrentUser, agent: Agent):
    return await agent.topics()

@router.get("/me/profile", response_model=ProfileOut)
def get_profile(user: CurrentUser, db: DbSession):
    return services.get_or_create_profile(db, user)

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
async def progress(user: CurrentUser, agent: Agent):
    return await agent.progress(learner_pseudonym(user.id))
