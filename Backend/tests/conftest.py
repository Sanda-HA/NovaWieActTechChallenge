import json
import os
import uuid
from pathlib import Path

# Tests always run against a dedicated database, never the one in .env.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://ednova:ednova@127.0.0.1:55432/ednova_test"
)
os.environ["SECRET_KEY"] = "test-secret"

import httpx  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402

from src.ai.interface import AgentClient, get_agent  # noqa: E402
from src.Database.core import SessionLocal, engine  # noqa: E402
from src.main import app  # noqa: E402

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def chat_response(**overrides) -> dict:
    return {
        "answer": "La probabilité de A sachant B est P(A∩B)/P(B).",
        "badge": "course",
        "sources": [{"chunk_id": "math_4eme_ma_009_chunk_004", "source": "Manuel", "page": 12}],
        "next_step": None,
        "topic": "probabilites",
        "response_id": uuid.uuid4().hex,
        "mode": "explain",
        "trace": [],
        "receipt": {},
        "degraded": False,
        "capacity_level": "FULL",
        **overrides,
    }


class FakeAgent:
    """Stands in for llm_service: records every request, answers with canned bodies."""

    def __init__(self):
        self.calls: list[tuple[str, str, object]] = []
        self.responses: dict[str, httpx.Response] = {}
        self.unreachable = False

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if self.unreachable:
            raise httpx.ConnectError("connection refused", request=request)
        body = json.loads(request.content) if request.content else None
        path = request.url.path
        self.calls.append((request.method, path, body))
        if path in self.responses:
            return self.responses[path]
        if path == "/chat":
            return httpx.Response(200, json=chat_response())
        if path == "/chat/events":
            events = [("stage", {"stage": "understanding"}), ("result", chat_response())]
            sse = "".join(f"event: {k}\ndata: {json.dumps(d)}\n\n" for k, d in events)
            return httpx.Response(200, text=sse, headers={"content-type": "text/event-stream"})
        if path == "/diagnostic":
            return httpx.Response(200, json={"preferences": [], "styles_probe": {
                "id": "s1", "concept": "dérivabilité", "versions": {"examples": "Exemple"},
            }, "level_check": []})
        if path.startswith("/diagnostic/"):
            return httpx.Response(200, json={"style": "examples", "level_estimate": "fragile", "weights": {},
                                             "diagnostic_score": None, "diagnostic_score_max": 3})
        if path.endswith("/progress"):
            return httpx.Response(200, json={"style": "examples", "level_estimate": "unknown",
                                             "diagnosed": False, "topics": [], "subtopics": []})
        if path == "/group/check":
            return httpx.Response(200, json={"verdict": "unknown"})
        if path == "/feedback":
            return httpx.Response(200, json={"removed_from_cache": 0})
        return httpx.Response(200, json={"path": path})

    def last(self, path: str):
        return [body for _, p, body in self.calls if p == path][-1]


@pytest.fixture(scope="session", autouse=True)
def database():
    try:
        engine.connect().close()
    except OperationalError:
        pytest.skip("Postgres not reachable: set TEST_DATABASE_URL (see README)")
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users CASCADE"))


@pytest.fixture
def agent():
    return FakeAgent()


@pytest.fixture
def client(agent):
    app.dependency_overrides[get_agent] = lambda: AgentClient("http://agent", transport=httpx.MockTransport(agent))
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def db():
    with SessionLocal() as s:
        yield s


def register(client, pseudo="eleve01") -> dict:
    password = "motdepasse-test"
    assert client.post("/auth/register", json={"pseudo": pseudo, "password": password}).status_code == 201
    token = client.post("/auth/login", data={"username": pseudo, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth(client):
    return register(client)
