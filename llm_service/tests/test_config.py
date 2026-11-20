import pytest

from app.config import Settings


def test_from_env_reads_required_values(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x/v1/")
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("COMPACT_MODEL", "c")
    monkeypatch.setenv("MID_SIZE_MODEL", "m")
    s = Settings.from_env()
    assert s.llm_base_url == "http://x/v1"
    assert (s.compact_model, s.mid_model) == ("c", "m")
    assert (s.max_concurrency, s.requests_per_minute) == (2, 20)


def test_loads_local_dotenv_without_overriding_shell_or_exposing_key(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    for name in ("LLM_BASE_URL", "LLM_API_KEY", "COMPACT_MODEL", "MID_SIZE_MODEL"):
        monkeypatch.delenv(name, raising=False)
    (tmp_path / ".env").write_text(
        "LLM_BASE_URL=https://provider.example/v1\nLLM_API_KEY=private-test-key\n"
        "COMPACT_MODEL=compact\nMID_SIZE_MODEL=mid\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("COMPACT_MODEL", "override")
    settings = Settings.from_env()
    assert settings.llm_base_url == "https://provider.example/v1"
    assert settings.compact_model == "override"
    assert settings.llm_api_key == "private-test-key"
    assert "private-test-key" not in repr(settings)


@pytest.mark.parametrize("name,value", [("LLM_MAX_CONCURRENCY", "3"), ("LLM_REQUESTS_PER_MINUTE", "21")])
def test_rejects_limits_above_the_team_allowance(monkeypatch, name, value):
    for key in ("LLM_BASE_URL", "LLM_API_KEY", "COMPACT_MODEL", "MID_SIZE_MODEL"):
        monkeypatch.setenv(key, "configured")
    monkeypatch.setenv(name, value)
    with pytest.raises(ValueError, match=name):
        Settings.from_env()


def test_default_time_limits_end_before_the_backends_60_second_deadline():
    s = Settings(llm_base_url="http://x/v1", llm_api_key="k", compact_model="c", mid_model="m")
    assert s.request_timeout_s + s.fallback_timeout_s < 60
    assert s.quiz_timeout_s < 60 and s.mid_timeout_s <= s.quiz_timeout_s
