import pytest

from app.config import Settings


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
