import asyncio
import hashlib
import json
from dataclasses import dataclass, field

from app.capacity.governor import CapacityGovernor, Level
from app.providers.platform import (
    CeilingExceeded,
    Completion,
    ConcurrencyLimited,
    ModelSaturated,
    PlatformProvider,
    ProviderUnavailable,
    QuotaExhausted,
    Tier,
)


class CapacityUnavailable(Exception):
    def __init__(self, retry_after: float):
        super().__init__(f"capacity unavailable, retry in {retry_after:.0f}s")
        self.retry_after = retry_after


@dataclass
class CallResult:
    completion: Completion
    requested_tier: Tier
    events: list[str] = field(default_factory=list)

    @property
    def fell_back(self) -> bool:  # True when mid was asked for but compact answered
        return self.requested_tier is Tier.MID and self.completion.tier is Tier.COMPACT


@dataclass
class _SharedCall:
    task: asyncio.Task
    subscribers: int = 0
    credited: bool = False


class ResilientClient:
    """Applies the platform's error contract and keeps the governor informed."""

    MAX_QUOTA_WAIT_S = 8.0
    MAX_503_WAIT_S = 3.0

    def __init__(
        self, provider: PlatformProvider, governor: CapacityGovernor, max_concurrency: int = 2, sleep=asyncio.sleep
    ):
        self.provider = provider
        self.governor = governor
        self.sem = asyncio.Semaphore(max_concurrency)
        self.sleep = sleep
        self.inflight: dict[str, _SharedCall] = {}

    async def call(
        self, tier: Tier, messages: list[dict], max_tokens: int, json_mode: bool = False, shrink=None
    ) -> CallResult:
        key = hashlib.sha256(json.dumps([tier, messages, max_tokens, json_mode]).encode()).hexdigest()
        shared = self.inflight.get(key)
        if shared is None:
            shared = _SharedCall(asyncio.create_task(self._call(tier, messages, max_tokens, json_mode, shrink)))
            self.inflight[key] = shared

            def finished(done):
                if self.inflight.get(key) is shared:
                    self.inflight.pop(key, None)
                if not done.cancelled():
                    done.exception()

            shared.task.add_done_callback(finished)
        shared.subscribers += 1
        try:
            result = await asyncio.shield(shared.task)
            coalesced = shared.credited
            shared.credited = True
            return CallResult(result.completion, tier, result.events + (["coalesced"] if coalesced else []))
        finally:
            shared.subscribers -= 1
            if shared.subscribers == 0 and not shared.task.done():
                if self.inflight.get(key) is shared:
                    self.inflight.pop(key, None)
                shared.task.cancel()

    async def _call(self, tier, messages, max_tokens, json_mode, shrink) -> CallResult:
        requested = tier
        if tier is Tier.MID and self.governor.level >= Level.ECO:
            tier = Tier.COMPACT
        events: list[str] = [] if tier is requested else ["eco_downgrade"]
        retried = {"quota": False, "503": False, "shrink": False, "concurrency": 0, "down": False}
        while True:
            try:
                async with self.sem:
                    c = await self.provider.complete(tier, messages, max_tokens, json_mode)
                self.governor.observe_quota(c.quota_remaining, c.quota_limit)
                return CallResult(c, requested, events)
            except ModelSaturated as e:
                self.governor.observe_saturation()
                if not retried["503"] and e.retry_after <= self.MAX_503_WAIT_S:
                    retried["503"] = True
                    events.append("retry_503")
                    await self.sleep(e.retry_after)
                    continue
                if tier is Tier.MID:
                    tier = Tier.COMPACT
                    events.append("fallback_compact")
                    continue
                raise CapacityUnavailable(e.retry_after) from e
            except QuotaExhausted as e:
                self.governor.observe_exhausted(e.retry_after)
                if not retried["quota"] and e.retry_after <= self.MAX_QUOTA_WAIT_S:
                    retried["quota"] = True
                    events.append("retry_quota")
                    await self.sleep(e.retry_after)
                    continue
                raise CapacityUnavailable(e.retry_after) from e
            except ConcurrencyLimited as e:
                if e.retry_after > self.MAX_QUOTA_WAIT_S:
                    raise CapacityUnavailable(e.retry_after) from e
                if retried["concurrency"] < 2:
                    retried["concurrency"] += 1
                    events.append("retry_concurrency")
                    await self.sleep(max(e.retry_after, 0.5))
                    continue
                raise CapacityUnavailable(e.retry_after) from e
            except ProviderUnavailable as e:
                if tier is Tier.MID:
                    tier = Tier.COMPACT
                    events.append("fallback_compact_timeout")
                    continue
                if not retried["down"]:
                    retried["down"] = True
                    events.append("retry_unavailable")
                    await self.sleep(1.0)
                    continue
                raise CapacityUnavailable(max(e.retry_after, 5.0)) from e
            except CeilingExceeded:
                if shrink is None or retried["shrink"]:
                    raise
                retried["shrink"] = True
                events.append("shrink_400")
                messages, max_tokens = shrink(messages, max_tokens)
