"""Zero-token 'next learning step' (a spec requirement), built from the topic graph and the learner's counters."""

from typing import Literal

from app.pedagogy.topics import UNKNOWN, TopicGraph
from app.sessions import Profile

Event = Literal["answered", "confused", "solved"]

TEXT = {
    "fr": {
        "exercise": "S'entraîner sur « {label} » avec un exercice guidé",
        "exercise_msg": "Donne-moi un exercice sur {label}",
        "prerequisite": "Revoir d'abord « {label} » ?",
        "prerequisite_msg": "Explique-moi {label} simplement",
        "next_topic": "Passer à « {label} »",
        "next_topic_msg": "Explique-moi {label}",
    },
    "en": {
        "exercise": "Practise « {label} » with a guided exercise",
        "exercise_msg": "Give me an exercise on {label}",
        "prerequisite": "Review « {label} » first?",
        "prerequisite_msg": "Explain {label} simply",
        "next_topic": "Move on to « {label} »",
        "next_topic_msg": "Explain {label}",
    },
}


def _weakest(slugs: list[str], profile: Profile) -> str:
    def score(s: str) -> float:
        m = profile.topics[s].mastery if s in profile.topics else None
        return 0.5 if m is None else m

    return min(slugs, key=score)


def _step(kind: str, slug: str, mode: str, graph: TopicGraph, lang: str) -> dict:
    t = TEXT.get(lang, TEXT["fr"])
    label = graph.label(slug)
    return {
        "kind": kind,
        "topic": slug,
        "label": t[kind].format(label=label),
        "request": {"mode": mode, "message": t[f"{kind}_msg"].format(label=label)},
    }


def recommend(
    topic: str,
    event: Event,
    profile: Profile,
    graph: TopicGraph,
    lang: str = "fr",
    hints_used: int = 0,
    asks_this_session: int = 1,
) -> dict | None:
    if topic == UNKNOWN or not graph.known(topic):
        return None
    stats = profile.topics.get(topic)
    struggling = event == "confused" and (asks_this_session >= 2 or (stats and stats.confusions >= 2))
    if struggling and graph.prerequisites(topic):
        return _step("prerequisite", _weakest(graph.prerequisites(topic), profile), "explain", graph, lang)
    if event == "solved" and hints_used <= 1 and graph.next(topic):
        return _step("next_topic", _weakest(graph.next(topic), profile), "explain", graph, lang)
    return _step("exercise", topic, "guided", graph, lang)
