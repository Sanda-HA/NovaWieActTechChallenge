import os
from dataclasses import dataclass, field

from dotenv import dotenv_values


@dataclass(frozen=True)
class Settings:
    llm_base_url: str
    llm_api_key: str = field(repr=False)
    compact_model: str
    mid_model: str
    rag_url: str = "fake"
    quota_remaining_header: str = "X-Quota-Remaining"
    quota_limit_header: str = "X-Quota-Limit"
    max_concurrency: int = 2
    requests_per_minute: int = 20
    cache_path: str = "ednova_cache.sqlite3"
    learner_db_path: str = "ednova_learners.sqlite3"
    request_log_path: str = "logs/requests.jsonl"
    compact_timeout_s: float = 40.0
    mid_timeout_s: float = 90.0
    request_timeout_s: float = 45.0
    fallback_timeout_s: float = 5.0
    learner_requests_per_min: float = 6.0
    learner_burst: int = 4
    wellbeing_contact: str = ""

    def __post_init__(self) -> None:
        if not 1 <= self.max_concurrency <= 2:
            raise ValueError("LLM_MAX_CONCURRENCY must be between 1 and 2")
        if not 1 <= self.requests_per_minute <= 20:
            raise ValueError("LLM_REQUESTS_PER_MINUTE must be between 1 and 20")

    @classmethod
    def from_env(cls) -> "Settings":
        e = {**dotenv_values(".env", encoding="utf-8-sig", interpolate=False), **os.environ}
        for name in ("LLM_BASE_URL", "LLM_API_KEY", "COMPACT_MODEL", "MID_SIZE_MODEL"):
            if not e.get(name):
                raise ValueError(f"{name} is required. Set it in llm_service/.env or the environment.")
        return cls(
            llm_base_url=e["LLM_BASE_URL"].rstrip("/"),
            llm_api_key=e["LLM_API_KEY"],
            compact_model=e["COMPACT_MODEL"],
            mid_model=e["MID_SIZE_MODEL"],
            rag_url=e.get("RAG_URL", "fake"),
            quota_remaining_header=e.get("QUOTA_REMAINING_HEADER", "X-Quota-Remaining"),
            quota_limit_header=e.get("QUOTA_LIMIT_HEADER", "X-Quota-Limit"),
            max_concurrency=int(e.get("LLM_MAX_CONCURRENCY", "2")),
            requests_per_minute=int(e.get("LLM_REQUESTS_PER_MINUTE", "20")),
            cache_path=e.get("CACHE_PATH", "ednova_cache.sqlite3"),
            learner_db_path=e.get("LEARNER_DB_PATH", "ednova_learners.sqlite3"),
            request_log_path=e.get("REQUEST_LOG_PATH", "logs/requests.jsonl"),
            compact_timeout_s=float(e.get("COMPACT_TIMEOUT_S", "40")),
            mid_timeout_s=float(e.get("MID_TIMEOUT_S", "90")),
            request_timeout_s=float(e.get("REQUEST_TIMEOUT_S", "45")),
            fallback_timeout_s=float(e.get("FALLBACK_TIMEOUT_S", "5")),
            learner_requests_per_min=float(e.get("LEARNER_REQUESTS_PER_MIN", "6")),
            learner_burst=int(e.get("LEARNER_BURST", "4")),
            wellbeing_contact=e.get("WELLBEING_CONTACT", ""),
        )
