import math
import re
import time
from collections import deque
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from enum import Enum
from time import monotonic

import httpx

from app.config import Settings


class Tier(str, Enum):
    COMPACT = "compact"
    MID = "mid"


@dataclass
class Completion:
    text: str
    tier: Tier
    model: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    quota_remaining: int | None
    quota_limit: int | None


class PlatformError(Exception):
    def __init__(self, message: str, retry_after: float = 0.0):
        super().__init__(message)
        self.retry_after = retry_after


class QuotaExhausted(PlatformError): ...


class ConcurrencyLimited(PlatformError): ...


class ModelSaturated(PlatformError): ...


class CeilingExceeded(PlatformError): ...


class ProviderUnavailable(PlatformError): ...


def _int_header(headers: httpx.Headers, name: str) -> int | None:
    value = headers.get(name)
    return int(value) if value and value.isdigit() else None


def _retry_after(value: str) -> float:
    try:
        delay = float(value)
    except ValueError:
        try:
            date = parsedate_to_datetime(value)
            if date.tzinfo is None:
                return 5.0
            delay = date.timestamp() - time.time()
        except (TypeError, ValueError, OverflowError, OSError):
            return 5.0
    return max(0.0, delay) if math.isfinite(delay) else 5.0


class PlatformProvider:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.s = settings
        self.client = client or httpx.AsyncClient()
        self._request_times: deque[float] = deque()

    def _reserve_request(self, now: float) -> None:
        cutoff = now - 60
        while self._request_times and self._request_times[0] <= cutoff:
            self._request_times.popleft()
        if len(self._request_times) >= self.s.requests_per_minute:
            raise QuotaExhausted("local request limit", self._request_times[0] - cutoff)
        self._request_times.append(now)

    def timeout_for(self, tier: Tier) -> float:
        return self.s.compact_timeout_s if tier is Tier.COMPACT else self.s.mid_timeout_s

    def model_for(self, tier: Tier) -> str:
        return self.s.compact_model if tier is Tier.COMPACT else self.s.mid_model

    async def complete(
        self,
        tier: Tier,
        messages: list[dict],
        max_tokens: int,
        json_mode: bool = False,
        temperature: float = 0.2,
    ) -> Completion:
        body = {
            "model": self.model_for(tier),
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        started = monotonic()
        self._reserve_request(started)
        try:
            r = await self.client.post(
                f"{self.s.llm_base_url}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {self.s.llm_api_key}"},
                timeout=self.timeout_for(tier),
            )
        except httpx.TimeoutException as exc:
            raise ProviderUnavailable(f"timeout after {self.timeout_for(tier):.0f}s") from exc
        except httpx.TransportError as exc:
            raise ProviderUnavailable(f"transport error: {exc.__class__.__name__}") from exc
        latency_ms = int((monotonic() - started) * 1000)
        if r.status_code != 200:
            raise self._error_for(r)
        try:
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            usage = data.get("usage")
            if usage is None:
                usage = {}
            if not isinstance(text, str) or not isinstance(usage, dict):
                raise TypeError("invalid message or usage")
            tokens_in = usage.get("prompt_tokens", sum(len(m["content"]) for m in messages) // 4)
            tokens_out = usage.get("completion_tokens", len(text) // 4)
            if type(tokens_in) is not int or type(tokens_out) is not int:
                raise TypeError("invalid token count")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderUnavailable("malformed response") from exc
        if json_mode:
            fenced = re.fullmatch(r"```(?:json)?[ \t]*\r?\n(.*?)\r?\n```", text.strip(), re.IGNORECASE | re.DOTALL)
            if fenced:
                text = fenced[1]
        return Completion(
            text=text,
            tier=tier,
            model=body["model"],
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
            quota_remaining=_int_header(r.headers, self.s.quota_remaining_header),
            quota_limit=_int_header(r.headers, self.s.quota_limit_header),
        )

    @staticmethod
    def _error_for(r: httpx.Response) -> PlatformError:
        try:
            data = r.json()
        except ValueError:
            data = {}
        err = data.get("error", {}) if isinstance(data, dict) else {}
        if not isinstance(err, dict):
            err = {}
        code = err.get("code", "")
        retry_after = _retry_after(r.headers.get("Retry-After", ""))
        if r.status_code == 503:
            return ModelSaturated("platform model unavailable", retry_after)
        if r.status_code == 429 and code == "concurrency_limit":
            return ConcurrencyLimited("platform concurrency limit", retry_after)
        if r.status_code == 429:
            return QuotaExhausted("platform quota exhausted", retry_after)
        if r.status_code == 400:
            return CeilingExceeded("platform rejected the request")
        return ProviderUnavailable(f"platform returned HTTP {r.status_code}", retry_after)
