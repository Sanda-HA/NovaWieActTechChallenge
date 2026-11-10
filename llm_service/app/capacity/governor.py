import time
from enum import IntEnum


class Level(IntEnum):
    FULL = 0
    LEAN = 1
    ECO = 2
    OFFLINE = 3


class CapacityGovernor:
    """Turns quota headers and platform refusals into one capacity level."""

    LEAN_BELOW = 0.5
    ECO_BELOW = 0.2
    SATURATION_WINDOW_S = 60.0
    SATURATIONS_FOR_ECO = 2

    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.ratio = 1.0
        self.offline_until = 0.0
        self.saturations: list[float] = []

    def observe_quota(self, remaining: int | None, limit: int | None) -> None:
        if remaining is not None and limit:
            self.ratio = max(0.0, min(1.0, remaining / limit))
            if remaining > 0:
                self.offline_until = 0.0

    def observe_saturation(self) -> None:
        now = self.clock()
        self.saturations = [t for t in self.saturations if now - t < self.SATURATION_WINDOW_S] + [now]

    def observe_exhausted(self, retry_after: float) -> None:
        self.ratio = 0.0
        self.offline_until = self.clock() + retry_after

    @property
    def level(self) -> Level:
        now = self.clock()
        if now < self.offline_until:
            return Level.OFFLINE
        recent = [t for t in self.saturations if now - t < self.SATURATION_WINDOW_S]
        if self.ratio < self.ECO_BELOW or len(recent) >= self.SATURATIONS_FOR_ECO:
            return Level.ECO
        if self.ratio < self.LEAN_BELOW:
            return Level.LEAN
        return Level.FULL
