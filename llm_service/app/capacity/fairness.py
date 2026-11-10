import time


class FairShare:
    """One team key serves every student: cap LLM-backed requests per learner so one user cannot drain it.
    Cache hits and zero-call turns do not count."""

    def __init__(self, per_minute: float, burst: int, clock=time.monotonic):
        self.rate = per_minute / 60.0
        self.burst = burst
        self.clock = clock
        self.buckets: dict[str, tuple[float, float]] = {}

    def take(self, learner_id: str) -> float:
        """Returns 0 when allowed, otherwise the seconds to wait."""
        now = self.clock()
        tokens, last = self.buckets.get(learner_id, (float(self.burst), now))
        tokens = min(self.burst, tokens + (now - last) * self.rate)
        if tokens >= 1:
            self.buckets[learner_id] = (tokens - 1, now)
            return 0.0
        self.buckets[learner_id] = (tokens, now)
        return (1 - tokens) / self.rate
