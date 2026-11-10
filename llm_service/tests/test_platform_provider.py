import time
from dataclasses import replace
from email.utils import formatdate

import httpx
import pytest

from app.providers import platform
from app.providers.platform import (
    CeilingExceeded,
    ConcurrencyLimited,
    ModelSaturated,
    PlatformProvider,
    ProviderUnavailable,
    QuotaExhausted,
    Tier,
)


def provider_with(settings, handler):
    return PlatformProvider(settings, httpx.AsyncClient(transport=httpx.MockTransport(handler)))


async def test_success_reads_text_usage_and_quota_headers(settings):
    def handler(request):
        assert request.headers["Authorization"] == "Bearer test-key"
        assert b'"model":"mid-x"' in request.content.replace(b" ", b"")
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Bonjour"}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 3},
            },
            headers={"X-Quota-Remaining": "7", "X-Quota-Limit": "10"},
        )

    c = await provider_with(settings, handler).complete(Tier.MID, [{"role": "user", "content": "hi"}], 50)
    assert (c.text, c.tokens_in, c.tokens_out) == ("Bonjour", 12, 3)
    assert (c.quota_remaining, c.quota_limit) == (7, 10)


async def test_rolling_limit_counts_attempts_across_models(settings, monkeypatch):
    now = 0.0
    monkeypatch.setattr(platform, "monotonic", lambda: now)
    attempts = []

    def handler(request):
        attempts.append(request)
        return httpx.Response(503, json={"error": {"code": "model_class_saturated"}})

    provider = provider_with(replace(settings, requests_per_minute=2), handler)
    for tier in (Tier.COMPACT, Tier.MID):
        with pytest.raises(ModelSaturated):
            await provider.complete(tier, [], 10)
    now = 59.0
    with pytest.raises(QuotaExhausted) as info:
        await provider.complete(Tier.COMPACT, [], 10)
    assert info.value.retry_after == 1.0 and len(attempts) == 2
    now = 60.0
    with pytest.raises(ModelSaturated):
        await provider.complete(Tier.COMPACT, [], 10)
    assert len(attempts) == 3


async def test_json_mode_unwraps_a_fenced_response_but_leaves_normal_markdown(settings):
    content = '```json\n{"status":"ok"}\n```'
    provider = provider_with(
        settings, lambda request: httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    )
    assert (await provider.complete(Tier.MID, [], 10, json_mode=True)).text == '{"status":"ok"}'
    assert (await provider.complete(Tier.MID, [], 10)).text == content


@pytest.mark.parametrize(
    "status,code,retry,exc",
    [
        (503, "model_class_saturated", "4", ModelSaturated),
        (429, "team_quota_exhausted", "6", QuotaExhausted),
        (429, "concurrency_limit", "1", ConcurrencyLimited),
        (400, "ceiling_exceeded", None, CeilingExceeded),
    ],
)
async def test_error_contract_maps_to_typed_errors(settings, status, code, retry, exc):
    headers = {"Retry-After": retry} if retry else {}

    def handler(request):
        return httpx.Response(status, json={"error": {"code": code, "message": code}}, headers=headers)

    with pytest.raises(exc) as info:
        await provider_with(settings, handler).complete(Tier.COMPACT, [{"role": "user", "content": "x"}], 10)
    assert info.value.retry_after == float(retry or 0)


@pytest.mark.parametrize(
    "body",
    [
        {"choices": []},
        {"choices": [{"message": {"content": "bonjour"}}], "usage": {"prompt_tokens": None}},
    ],
)
async def test_malformed_platform_success_is_unavailable(settings, body):
    provider = provider_with(settings, lambda request: httpx.Response(200, json=body))
    with pytest.raises(ProviderUnavailable, match="malformed response"):
        await provider.complete(Tier.COMPACT, [], 10)


@pytest.mark.parametrize("body", [[], {"error": []}])
@pytest.mark.parametrize("use_date", [True, False])
async def test_retry_after_date_and_malformed_error_envelopes(settings, body, use_date):
    header = formatdate(time.time() + 60, usegmt=True) if use_date else "invalid"
    provider = provider_with(settings, lambda request: httpx.Response(503, json=body, headers={"Retry-After": header}))
    with pytest.raises(ModelSaturated) as info:
        await provider.complete(Tier.COMPACT, [], 10)
    assert 58 <= info.value.retry_after <= 60 if use_date else info.value.retry_after == 5.0


async def test_timeout_becomes_provider_unavailable(settings):
    def handler(request):
        assert request.extensions["timeout"]["read"] == settings.mid_timeout_s
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(ProviderUnavailable, match="timeout"):
        await provider_with(settings, handler).complete(Tier.MID, [{"role": "user", "content": "x"}], 10)
