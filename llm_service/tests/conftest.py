from pathlib import Path

import pytest

from app.agent.orchestrator import Orchestrator
from app.agent.tools import FakeRag
from app.cache.store import CacheStore
from app.capacity.governor import CapacityGovernor
from app.config import Settings
from app.pedagogy.topics import TopicGraph
from app.routing.router import ModelRouter
from app.sessions import LearnerStore, SessionStore
from tests.fakes import FakeClient

CHUNKS = Path(__file__).parent / "fixtures" / "chunks.json"


@pytest.fixture
def settings(tmp_path):
    return Settings(
        llm_base_url="http://llm.test/v1",
        llm_api_key="test-key",
        compact_model="compact-x",
        mid_model="mid-x",
        cache_path=str(tmp_path / "cache.sqlite3"),
        learner_db_path=str(tmp_path / "learners.sqlite3"),
        request_log_path=str(tmp_path / "logs" / "requests.jsonl"),
    )


@pytest.fixture
def make(tmp_path):
    def _make(*texts, fallback_on_mid=False, rag=None, client=None, fair=None, agentic=True):
        client = client or FakeClient(*texts, fallback_on_mid=fallback_on_mid)
        orch = Orchestrator(
            client,
            CapacityGovernor(),
            rag or FakeRag(CHUNKS),
            CacheStore(str(tmp_path / "c.sqlite3")),
            ModelRouter(),
            SessionStore(),
            LearnerStore(str(tmp_path / "l.sqlite3")),
            TopicGraph(),
            fair=fair,
            wellbeing_contact="",
            agentic=agentic,
        )
        return orch, client

    return _make
