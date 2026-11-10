from dataclasses import asdict, dataclass, field
from enum import Enum

from app.capacity.resilient import CallResult


class Badge(str, Enum):
    COURSE = "course"  # "D'après ton cours (source, p.)"
    GENERAL = "general"  # "Réponse générale, hors programme"
    NOT_FOUND = "not_found"  # "Je n'ai pas trouvé ça dans ton cours"
    CLARIFY = "clarify"


@dataclass
class Step:
    name: str
    tier: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    detail: dict = field(default_factory=dict)


@dataclass
class Trace:
    steps: list[Step] = field(default_factory=list)
    events: list[str] = field(default_factory=list)
    cache: str | None = None  # "exact" | "evidence" | "artifact"

    def rule(self, name: str, **detail) -> None:
        self.steps.append(Step(name, detail=detail))

    def llm(self, name: str, result: CallResult, **detail) -> None:
        c = result.completion
        if "coalesced" in result.events:
            self.steps.append(Step(name, detail={**detail, "coalesced_from": c.tier.value}))
        else:
            self.steps.append(Step(name, c.tier.value, c.tokens_in, c.tokens_out, c.latency_ms, detail))
        self.events.extend(result.events)

    def receipt(self) -> dict:
        llm_steps = [s for s in self.steps if s.tier]
        return {
            "llm_calls": len(llm_steps),
            "compact_calls": sum(s.tier == "compact" for s in llm_steps),
            "mid_calls": sum(s.tier == "mid" for s in llm_steps),
            "tokens_in": sum(s.tokens_in for s in llm_steps),
            "tokens_out": sum(s.tokens_out for s in llm_steps),
            "latency_ms": sum(s.latency_ms for s in llm_steps),
            "cache": self.cache,
            "events": self.events,
        }

    def as_list(self) -> list[dict]:
        return [asdict(s) for s in self.steps]
