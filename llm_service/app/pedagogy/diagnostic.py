import json
from pathlib import Path

from app.sessions import Profile

BANK = json.loads((Path(__file__).parent / "data" / "diagnostic_fr.json").read_text(encoding="utf-8"))


def items() -> dict:
    """The quiz shown to the student; answers to level_check are withheld."""
    return {
        "preferences": BANK["preferences"],
        "styles_probe": BANK["styles_probe"],
        "level_check": [{k: v for k, v in q.items() if k != "answer"} for q in BANK["level_check"]],
    }


def score(answers: dict, profile: Profile) -> Profile:
    """Score study-method answers and update explanation preferences without calling a model."""
    for p in BANK["preferences"]:
        if answers.get(p["id"]) in p["options"]:
            profile.reward(answers[p["id"]], 1.0)
    probe = answers.get(BANK["styles_probe"]["id"])
    if probe in BANK["styles_probe"]["versions"]:
        profile.reward(probe, 2.0)  # what actually helped beats what they say they like
    correct = sum(answers.get(q["id"]) == q["answer"] for q in BANK["level_check"])
    complete = all(answers.get(q["id"]) in q["options"] for q in BANK["level_check"])
    profile.diagnostic_score = correct if complete else None
    profile.level_estimate = ["fragile", "fragile", "moyen", "solide"][correct]
    profile.diagnosed = True
    return profile
