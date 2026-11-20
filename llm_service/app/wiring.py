from dataclasses import dataclass
from pathlib import Path

from app.agent.orchestrator import Orchestrator
from app.agent.tools import FakeRag, HttpRag
from app.cache.store import CacheStore, RedisCacheStore
from app.capacity.fairness import FairShare
from app.capacity.governor import CapacityGovernor
from app.capacity.resilient import ResilientClient
from app.config import Settings
from app.pedagogy.topics import TopicGraph
from app.providers.platform import PlatformProvider
from app.routing.router import ModelRouter
from app.sessions import LearnerStore, RedisSessionStore, SessionStore

FAKE_RAG_FIXTURE = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "chunks.json"


@dataclass
class Service:
    orchestrator: Orchestrator
    client: ResilientClient
    governor: CapacityGovernor
    rag: object
    learners: LearnerStore
    topics: TopicGraph


def build_service(
    settings: Settings,
    provider: PlatformProvider | None = None,
    *,
    router: ModelRouter | None = None,
    agentic: bool = True,
    fair: bool = True,
) -> Service:
    """The one place where the pieces are wired together (API, benchmark and chaos test all use it)."""
    governor = CapacityGovernor()
    client = ResilientClient(provider or PlatformProvider(settings), governor, settings.max_concurrency)
    rag = FakeRag(FAKE_RAG_FIXTURE) if settings.rag_url == "fake" else HttpRag(settings.rag_url)
    learners, topics = LearnerStore(settings.learner_db_path), TopicGraph()
    fair_share = FairShare(settings.learner_requests_per_min, settings.learner_burst) if fair else None
    cache = RedisCacheStore(settings.redis_url) if settings.redis_url else CacheStore(":memory:")
    sessions = RedisSessionStore(settings.redis_url) if settings.redis_url else SessionStore()
    orch = Orchestrator(
        client,
        governor,
        rag,
        cache,
        router or ModelRouter(),
        sessions,
        learners,
        topics,
        fair_share,
        settings.wellbeing_contact,
        agentic,
        request_timeout_s=settings.request_timeout_s,
        fallback_timeout_s=settings.fallback_timeout_s,
    )
    return Service(orch, client, governor, rag, learners, topics)
