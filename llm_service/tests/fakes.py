import json

from app.capacity.resilient import CallResult
from app.providers.platform import Completion, Tier


class FakeClient:
    """Stands in for ResilientClient: returns queued texts, records tier and prompt of each call."""

    def __init__(self, *texts, fallback_on_mid: bool = False):
        self.texts = list(texts)
        self.calls: list[tuple[Tier, list[dict]]] = []
        self.fallback_on_mid = fallback_on_mid

    async def call(self, tier, messages, max_tokens, json_mode=False, shrink=None):
        self.calls.append((tier, messages))
        text = self.texts.pop(0)
        if isinstance(text, dict):
            text = json.dumps(text, ensure_ascii=False)
        served = Tier.COMPACT if (self.fallback_on_mid and tier is Tier.MID) else tier
        events = ["fallback_compact"] if served is not tier else []
        return CallResult(Completion(text, served, served.value, 50, 20, 10, 9, 10), tier, events)
