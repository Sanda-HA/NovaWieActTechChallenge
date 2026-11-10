from fastapi import APIRouter
from ..auth.services import CurrentUser
from ..Database.core import DbSession
from . import services
from .schemas import StudySessionOut, StudySummary

router = APIRouter(prefix="/study", tags=["study"])

@router.post("/start", response_model=StudySessionOut)
def start(user: CurrentUser, db: DbSession):
    return services.start(db, user)

@router.post("/stop", response_model=StudySessionOut)
def stop(user: CurrentUser, db: DbSession):
    return services.stop(db, user)

@router.get("/summary", response_model=StudySummary)
def summary(user: CurrentUser, db: DbSession):
    return services.summary(db, user)
