from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from ..ai.interface import Agent
from ..Database.core import DbSession
from ..tutor.models import ChatSession
from ..utils import learner_pseudonym
from . import services
from .schemas import UserCreate, UserOut, Token
from .services import CurrentUser


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: DbSession):
    return services.create_user(db, data)

@router.post("/login", response_model=Token)
def login(db: DbSession, form: OAuth2PasswordRequestForm = Depends()):
    user = services.authenticate(db, form.username, form.password)
    return Token(access_token=services.create_token(user))

@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user

@router.delete("/me", status_code=204)
async def delete_me(user: CurrentUser, db: DbSession, agent: Agent):
    session_ids = [str(sid) for sid in db.scalars(select(ChatSession.id).where(ChatSession.user_id == user.id))]
    await agent.purge_learner(learner_pseudonym(user.id), session_ids)
    try:
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise
