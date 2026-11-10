from app.capacity.governor import Level
from app.providers.platform import Tier
from app.routing.router import ModelRouter, RouteContext

R = ModelRouter()


def test_grounded_simple_explanation_goes_compact():
    assert R.choose("answer", RouteContext(Level.FULL)) == (Tier.COMPACT, "grounded_rewrite")


def test_reasoning_multi_search_and_darija_go_mid():
    assert R.choose("answer", RouteContext(Level.FULL, needs_reasoning=True))[0] is Tier.MID
    assert R.choose("answer", RouteContext(Level.FULL, action="MULTI_SEARCH"))[0] is Tier.MID
    assert R.choose("answer", RouteContext(Level.FULL, language="darija"))[0] is Tier.MID


def test_eco_forces_compact_everywhere():
    assert R.choose("hint_ladder", RouteContext(Level.ECO)) == (Tier.COMPACT, "eco_level")


def test_fixed_steps():
    assert R.choose("triage", RouteContext(Level.FULL))[0] is Tier.COMPACT
    assert R.choose("hint_ladder", RouteContext(Level.FULL))[0] is Tier.MID


def test_forced_tier_for_baselines():
    assert ModelRouter(force=Tier.MID).choose("triage", RouteContext(Level.FULL)) == (Tier.MID, "forced")
