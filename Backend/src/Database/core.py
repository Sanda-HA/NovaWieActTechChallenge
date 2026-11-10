from  typing import Annotated
from fastapi import Depends
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session 
#add the engine setup
from sqlalchemy import create_engine
from ..config import settings
engine=create_engine(settings.database_url ,pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DbSession = Annotated[Session, Depends(get_db)]

# dbsession : raccourci t7at fl parametres de tes routes 