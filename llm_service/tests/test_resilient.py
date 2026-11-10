import asyncio

import pytest

from app.capacity.governor import CapacityGovernor, Level
from app.capacity.resilient import CapacityUnavailable, ResilientClient
from app.providers.platform import (
    CeilingExceeded,
    Completion,
    ConcurrencyLimited,
    ModelSaturated,
    ProviderUnavailable,
    QuotaExhausted,
    Tier,
)
from app.trace import Trace


def ok(tier, remaining=9, limit=10):
    return Completion("ok", tier, tier.value, 10, 2, 5, remaining, limit)


class ScriptedProvider:
    """Raises or returns the scripted outcomes in order; records each call's tier."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.tiers = []
        self.max_tokens = []

    async def complete(self, tier, messages, max_tokens, json_mode=False):
        self.tiers.append(tier)
        self.max_tokens.append(max_tokens)
        out = self.outcomes.pop(0)
        if isinstance(out, Exception):
            raise out
        await asyncio.sleep(0)
        return out if out != "ok" else ok(tier)


async def no_sleep(_):
    return None


MSG = [{"role": "user", "content": "q"}]


async def test_cancelling_originating_call_does_not_cancel_coalesced_follower():
    entered, release = asyncio.Event(), asyncio.Event()

    class BlockingProvider:
        async def complete(self, tier, *args):
            entered.set()
            await release.wait()
            return ok(tier)

    client = ResilientClient(BlockingProvider(), CapacityGovernor())
    first = asyncio.create_task(client.call(Tier.COMPACT, MSG, 50))
    await entered.wait()
    second = asyncio.create_task(client.call(Tier.COMPACT, MSG, 50))
    await asyncio.sleep(0)
    first.cancel()
    await asyncio.gather(first, return_exceptions=True)
    release.set()
    result = await asyncio.wait_for(second, 1)
    assert result.completion.text == "ok"
    assert "coalesced" not in result.events  # The only delivered receipt must count the physical call.


async def test_inference_is_cancelled_when_its_last_subscriber_leaves():
    entered, cancelled = asyncio.Event(), asyncio.Event()

    class BlockingProvider:
        async def complete(self, *args):
            entered.set()
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.set()

    client = ResilientClient(BlockingProvider(), CapacityGovernor())
    pending = asyncio.create_task(client.call(Tier.COMPACT, MSG, 50))
    await entered.wait()
    pending.cancel()
    await asyncio.gather(pending, return_exceptions=True)
    try:
        await asyncio.wait_for(cancelled.wait(), 0.2)
        assert not client.inflight
    finally:
        tasks = [shared.task for shared in client.inflight.values()]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def test_503_with_long_wait_falls_back_to_compact():
    p = ScriptedProvider(ModelSaturated("busy", 10), "ok")
    r = await ResilientClient(p, CapacityGovernor(), sleep=no_sleep).call(Tier.MID, MSG, 100)
    assert p.tiers == [Tier.MID, Tier.COMPACT]
    assert r.fell_back and "fallback_compact" in r.events


async def test_503_with_short_wait_retries_mid_once():
    p = ScriptedProvider(ModelSaturated("busy", 2), "ok")
    r = await ResilientClient(p, CapacityGovernor(), sleep=no_sleep).call(Tier.MID, MSG, 100)
    assert p.tiers == [Tier.MID, Tier.MID]
    assert not r.fell_back


async def test_quota_short_wait_retries_long_wait_raises():
    p = ScriptedProvider(QuotaExhausted("empty", 5), "ok")
    await ResilientClient(p, CapacityGovernor(), sleep=no_sleep).call(Tier.COMPACT, MSG, 100)
    p2 = ScriptedProvider(QuotaExhausted("empty", 30))
    g = CapacityGovernor()
    with pytest.raises(CapacityUnavailable):
        await ResilientClient(p2, g, sleep=no_sleep).call(Tier.COMPACT, MSG, 100)
    assert g.level is Level.OFFLINE


async def test_long_concurrency_refusal_does_not_sleep():
    async def unexpected_sleep(_):
        raise AssertionError("long concurrency refusal must not sleep")

    provider = ScriptedProvider(ConcurrencyLimited("busy", 3600))
    with pytest.raises(CapacityUnavailable) as info:
        await ResilientClient(provider, CapacityGovernor(), sleep=unexpected_sleep).call(Tier.COMPACT, MSG, 100)
    assert info.value.retry_after == 3600 and provider.tiers == [Tier.COMPACT]


async def test_400_is_retried_only_after_shrinking():
    p = ScriptedProvider(CeilingExceeded("too long"), "ok")

    def shrink(msgs, mt):
        return msgs, mt // 2

    r = await ResilientClient(p, CapacityGovernor(), sleep=no_sleep).call(Tier.COMPACT, MSG, 800, shrink=shrink)
    assert p.max_tokens == [800, 400] and "shrink_400" in r.events
    with pytest.raises(CeilingExceeded):
        await ResilientClient(ScriptedProvider(CeilingExceeded("x")), CapacityGovernor(), sleep=no_sleep).call(
            Tier.COMPACT, MSG, 800
        )


async def test_eco_level_downgrades_mid_before_calling():
    g = CapacityGovernor()
    g.observe_quota(1, 10)
    p = ScriptedProvider("ok")
    r = await ResilientClient(p, g, sleep=no_sleep).call(Tier.MID, MSG, 100)
    assert p.tiers == [Tier.COMPACT] and r.fell_back


async def test_identical_concurrent_calls_are_coalesced():
    p = ScriptedProvider("ok", "ok")
    client = ResilientClient(p, CapacityGovernor(), sleep=no_sleep)
    a, b = await asyncio.gather(client.call(Tier.COMPACT, MSG, 50), client.call(Tier.COMPACT, MSG, 50))
    assert len(p.tiers) == 1
    assert "coalesced" in a.events + b.events


async def test_coalesced_follower_receipt_does_not_double_count():
    provider = ScriptedProvider("ok")
    client = ResilientClient(provider, CapacityGovernor(), sleep=no_sleep)
    first, second = await asyncio.gather(client.call(Tier.COMPACT, MSG, 50), client.call(Tier.COMPACT, MSG, 50))
    leader, follower = Trace(), Trace()
    leader.llm("answer", first)
    follower.llm("answer", second)
    receipts = [leader.receipt(), follower.receipt()]
    assert sum(receipt["llm_calls"] for receipt in receipts) == 1
    assert sum(receipt["tokens_in"] for receipt in receipts) == 10
    assert sum(receipt["tokens_out"] for receipt in receipts) == 2
    step = follower.as_list()[0]
    assert step["tier"] is None and step["latency_ms"] == 0
    assert step["detail"]["coalesced_from"] == "compact"


async def test_mid_timeout_falls_back_to_compact_and_compact_outage_raises():
    p = ScriptedProvider(ProviderUnavailable("timeout"), "ok")
    r = await ResilientClient(p, CapacityGovernor(), sleep=no_sleep).call(Tier.MID, MSG, 100)
    assert p.tiers == [Tier.MID, Tier.COMPACT] and "fallback_compact_timeout" in r.events
    down = ScriptedProvider(ProviderUnavailable("down"), ProviderUnavailable("down"))
    with pytest.raises(CapacityUnavailable):
        await ResilientClient(down, CapacityGovernor(), sleep=no_sleep).call(Tier.COMPACT, MSG, 100)
    assert len(down.tiers) == 2
