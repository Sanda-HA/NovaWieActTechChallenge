from contextlib import asynccontextmanager

from fastapi import FastAPI


from fastapi.middleware.cors import CORSMiddleware
from .ai.interface import AgentClient
from .api import register_routes
from .config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.agent = AgentClient(settings.agent_url)
    yield
    await app.state.agent.aclose()


app = FastAPI(
    title="EdNova API",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app)


@app.get("/")
async def root():
    return {"message": "Welcome to Ednovaa!"}
