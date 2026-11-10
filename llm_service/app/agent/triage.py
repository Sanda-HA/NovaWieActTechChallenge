import json
from enum import Enum

from pydantic import BaseModel, Field, ValidationError

from app.capacity.resilient import ResilientClient
from app.pedagogy.confusion import guess_language, is_confused
from app.pedagogy.topics import UNKNOWN, TopicGraph
from app.providers.platform import Tier
from app.trace import Trace


class Action(str, Enum):
    DIRECT_ANSWER = "DIRECT_ANSWER"
    SEARCH_COURSE = "SEARCH_COURSE"
    SEARCH_EXERCISES = "SEARCH_EXERCISES"
    MULTI_SEARCH = "MULTI_SEARCH"
    ASK_CLARIFICATION = "ASK_CLARIFICATION"


class Triage(BaseModel):
    action: Action
    subject: str = "math"
    topic: str = UNKNOWN
    subtopic: str | None = None
    difficulty: int = Field(default=2, ge=1, le=3)
    language: str = "fr"
    queries: list[str] = Field(default_factory=list, max_length=2)
    needs_reasoning: bool = False
    confused: bool = False
    standalone: bool = True


TRIAGE_SYSTEM = """Tu es le module de tri d'un tuteur pour le Bac tunisien.
Réponds UNIQUEMENT avec un objet JSON:
{{"action": "DIRECT_ANSWER|SEARCH_COURSE|SEARCH_EXERCISES|MULTI_SEARCH|ASK_CLARIFICATION",
 "subject": "{subject}",
 "topic": "un seul identifiant parmi: {topics}, ou autre",
 "subtopic": "notion précise parmi {subtopics}, uniquement si certaine et sous probabilites; sinon null",
 "difficulty": 1|2|3,
 "language": "fr|en|ar|darija",
 "queries": ["1 ou 2 requêtes de recherche en français, avec la notion du programme"],
 "needs_reasoning": true si un calcul ou une démonstration en plusieurs étapes est demandé,
 "confused": true si l'élève dit qu'il ne comprend pas,
 "standalone": false si le message n'a de sens qu'avec l'historique (ex: "et pourquoi ?", "un autre exemple")}}
Règles: MULTI_SEARCH si la question compare ou combine plusieurs notions (2 requêtes).
ASK_CLARIFICATION si la notion visée est introuvable même avec l'historique.
SEARCH_COURSE pour une définition, une propriété, une explication du programme ou une demande de citation.
Exemple : « Quelle est la définition de la dérivabilité en un point ? » → SEARCH_COURSE.
DIRECT_ANSWER seulement pour l'organisation, la motivation, ou une question hors programme.
SEARCH_EXERCISES si l'élève donne un énoncé d'exercice ou demande un exercice.
La darija peut être en lettres latines (chnowa, kifech, 3) ou arabes. Les requêtes restent en français."""


def fallback_triage(message: str, confused: bool) -> Triage:
    return Triage(action=Action.SEARCH_COURSE, queries=[message[:200]], confused=confused)


async def triage(
    message: str, history_summary: str, level: str, client: ResilientClient, trace: Trace, topics: TopicGraph,
    *, subject: str | None = None,
) -> Triage:
    confused = is_confused(message)
    lang_hint = guess_language(message)
    user = f"Niveau: {level}\nHistorique: {history_summary or '(vide)'}\nMessage: {message}"
    system = TRIAGE_SYSTEM.format(
        subject=subject or "math", topics=", ".join(topics.slugs), subtopics=", ".join(topics.subtopics),
    )
    if subject and subject != "math":
        system += "\nLe graphe est réservé aux maths : utilise topic=autre et subtopic=null pour cette matière."
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    result = await client.call(Tier.COMPACT, messages, max_tokens=220, json_mode=True)
    trace.llm("triage", result)
    try:
        t = Triage.model_validate(json.loads(result.completion.text))
    except (json.JSONDecodeError, ValidationError):
        trace.steps[-1].detail.update(action=Action.SEARCH_COURSE.value, fallback=True)
        trace.rule("triage_default")
        return fallback_triage(message, confused)
    if not topics.known(t.topic):
        t.topic = UNKNOWN
    if not topics.valid_subtopic(t.subtopic, t.topic):
        t.subtopic = None
    if lang_hint:
        t.language = lang_hint
    trace.steps[-1].detail.update(action=t.action.value, topic=t.topic)
    t.confused = t.confused or confused
    if t.action is not Action.DIRECT_ANSWER and not t.queries:
        t.queries = [message[:200]]
    return t
