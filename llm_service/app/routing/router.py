from dataclasses import dataclass
from pathlib import Path

import yaml

from app.capacity.governor import Level
from app.providers.platform import Tier

POLICY_PATH = Path(__file__).with_name("routing_policy.yaml")


@dataclass
class RouteContext:
    level: Level
    action: str = "SEARCH_COURSE"
    difficulty: int = 2
    needs_reasoning: bool = False
    language: str = "fr"
    evidence: str = "sufficient"


class ModelRouter:
    def __init__(self, policy: dict | None = None, force: Tier | None = None):
        self.p = policy or yaml.safe_load(POLICY_PATH.read_text(encoding="utf-8"))
        self.force = force  # benchmark baselines: always-compact / always-mid

    def choose(self, step: str, ctx: RouteContext) -> tuple[Tier, str]:
        if self.force is not None:
            return self.force, "forced"
        if ctx.level >= Level.ECO:
            return Tier.COMPACT, "eco_level"
        if step in self.p["compact_steps"]:
            return Tier.COMPACT, "compact_step"
        if step in self.p["mid_steps"]:
            return Tier.MID, "mid_step"
        a = self.p["answer"]
        if ctx.action == "MULTI_SEARCH":
            return Tier.MID, "multi_search"
        if a["mid_if_needs_reasoning"] and ctx.needs_reasoning:
            return Tier.MID, "reasoning"
        if ctx.difficulty >= a["mid_if_difficulty_at_least"]:
            return Tier.MID, "difficulty"
        if ctx.language in a["mid_if_language"]:
            return Tier.MID, "language"
        if ctx.level >= Level.LEAN:
            return Tier.COMPACT, "lean_level"
        if ctx.evidence in a["mid_if_evidence"]:
            return Tier.MID, "partial_evidence"
        return Tier.COMPACT, "grounded_rewrite"
