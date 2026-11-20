import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI


from fastapi.middleware.cors import CORSMiddleware
from .ai.interface import AgentClient
from .api import register_routes
from .config import settings
from .groups.maintenance import dispatch_tutor_jobs, maintain_groups


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.agent = AgentClient(settings.agent_url)
    tasks = [
        asyncio.create_task(maintain_groups()),
        asyncio.create_task(dispatch_tutor_jobs(app.state.agent)),
        asyncio.create_task(dispatch_tutor_jobs(app.state.agent)),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
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
