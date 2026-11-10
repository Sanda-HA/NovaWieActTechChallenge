from datetime import datetime, timedelta,timezone
import uuid
from fastapi.security import OAuth2PasswordBearer
import jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from ..config import settings
from .models import User
from typing import Annotated
from fastapi import Depends
from .exceptions import PseudoAlreadyUsed, InvalidCredentials
from ..Database.core import DbSession
from .exceptions import InvalidToken




password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_user(db, data):
    if db.scalar(select(User).where(User.pseudo == data.pseudo)):  # sqlalchemy execute requete sql 
        raise PseudoAlreadyUsed()
    user = User(
        pseudo=data.pseudo,
        password_hash=password_hash.hash(data.password),
        language=data.language,
    )
    db.add(user)   
    db.commit()   
    db.refresh(user)
    return user



def authenticate(db, pseudo, password):
    user = db.scalar(select(User).where(User.pseudo == pseudo))
    if not user or not password_hash.verify(password, user.password_hash):
        raise InvalidCredentials()
    return user



def create_token(user):
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user.id), "exp": exp}, settings.secret_key, algorithm="HS256")



def user_from_token(db, token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return db.get(User, uuid.UUID(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None 

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DbSession) -> User:
    user = user_from_token(db, token)
    if not user:
        raise InvalidToken()
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]