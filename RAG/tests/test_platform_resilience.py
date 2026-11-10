"""Mocked platform endpoint: checks the plan's resilience table (429 wait+retry, 503 retry, 400 shrink)."""
from unittest import mock

from app import config, embeddings


class FakeResponse:
    def __init__(self, status, payload=None, headers=None):
        self.status_code, self._payload, self.headers = status, payload or {}, headers or {}

    def json(self):
        return self._payload


def ok_response(n):
    return FakeResponse(200, {"data": [{"index": i, "embedding": [1.0, 0.0, 0.0]} for i in range(n)]})


def configure(monkeypatch):
    monkeypatch.setattr(config, "PLATFORM_BASE_URL", "https://example.invalid")
    monkeypatch.setattr(config, "PLATFORM_API_KEY", "test-key")
    monkeypatch.setattr(config, "EMBED_MODEL", "test-model")
    monkeypatch.setattr(config, "EMBED_BATCH_SIZE", 4)
    monkeypatch.setattr(embeddings.time, "sleep", lambda s: None)


def test_429_waits_then_retries(monkeypatch):
    configure(monkeypatch)
    answers = [FakeResponse(429, headers={"Retry-After": "2"}), ok_response(2)]
    with mock.patch.object(embeddings.requests, "post", side_effect=answers) as post:
        mat = embeddings.embed_platform(["a", "b"])
    assert mat.shape == (2, 3) and post.call_count == 2


def test_503_retries(monkeypatch):
    configure(monkeypatch)
    answers = [FakeResponse(503), FakeResponse(503), ok_response(1)]
    with mock.patch.object(embeddings.requests, "post", side_effect=answers):
        assert embeddings.embed_platform(["a"]).shape == (1, 3)


def test_400_shrinks_the_batch(monkeypatch):
    configure(monkeypatch)
    sizes = []

    def fake_post(url, headers, json, timeout):
        sizes.append(len(json["input"]))
        return FakeResponse(400) if len(json["input"]) > 2 else ok_response(len(json["input"]))

    with mock.patch.object(embeddings.requests, "post", side_effect=fake_post):
        mat = embeddings.embed_platform(["a", "b", "c", "d"])
    assert mat.shape == (4, 3) and sizes[0] == 4 and max(sizes[1:]) <= 2


def test_key_is_only_sent_as_bearer_header(monkeypatch):
    configure(monkeypatch)
    with mock.patch.object(embeddings.requests, "post", return_value=ok_response(1)) as post:
        embeddings.embed_platform(["a"])
    assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer test-key"
    assert "test-key" not in str(post.call_args.kwargs["json"])
