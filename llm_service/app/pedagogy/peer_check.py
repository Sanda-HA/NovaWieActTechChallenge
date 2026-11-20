"""Group mode: check a student's explanation to peers against the course (the spec's core problem)."""

import json

from app.agent.evidence import LOW
from app.agent.tools import RagUnavailable, SearchRequest
from app.capacity.resilient import CapacityUnavailable, ResilientClient
from app.providers.platform import Tier
from app.trace import Trace
from app.validation.validator import chunk_ref

PEER_SYSTEM = """Un élève vient d'expliquer une notion à son groupe de révision.
Compare son explication aux extraits du cours, puis remplis les champs:
- verdict: "correct", "incomplete" ou "incorrect".
- issue: l'idée fausse ou manquante, en une phrase de ton cru; chaîne vide si correct.
- chunk_id: l'identifiant entre crochets de l'extrait qui le montre.
- guiding_question: une question au groupe pour qu'il trouve lui-même l'erreur, sans donner la correction;
  si correct, une question pour aller plus loin.
- missing_points: jusqu'à 3 points courts du cours que l'explication omet ou déforme; liste vide si correct.
- restate_prompt: une phrase qui demande à l'élève de réexpliquer en couvrant ces points.
Écris tous les textes en {lang}, même si l'extrait est dans une autre langue. Ne recopie jamais ces consignes.
Réponds UNIQUEMENT avec ce JSON rempli:
{{"verdict": "", "issue": "", "chunk_id": "", "guiding_question": "", "missing_points": [], "restate_prompt": ""}}"""

NOT_IN_COURSE = {
    "fr": "Je n'ai pas trouvé cette notion dans le cours : vérifiez ensemble dans votre manuel avant de continuer.",
    "en": "I couldn't find this in the course: check your textbook together before going on.",
    "ar": "لم أجد هذا المفهوم في الدرس: تحققوا معًا من كتابكم المدرسي قبل المتابعة.",
}
LANG_NAMES = {"fr": "français", "en": "anglais", "ar": "arabe"}
VERDICTS = {"correct", "incomplete", "incorrect"}


async def check_peer_explanation(
    explanation: str,
    search: SearchRequest,
    rag,
    client: ResilientClient,
    trace: Trace,
    reply_language: str = "fr",
    *,
    fair=None,
    learner_id: str = "",
) -> dict:
    try:
        chunks = await rag.search("search_courses", search)
    except RagUnavailable:
        chunks = []
    trace.rule("tool", tool="search_courses", ids=[c.chunk_id for c in chunks])
    if not chunks or max(c.score for c in chunks) < LOW:
        return {
            "verdict": "unknown",
            "issue": "",
            "guiding_question": NOT_IN_COURSE.get(reply_language, NOT_IN_COURSE["fr"]),
            "missing_points": [],
            "restate_prompt": "",
            "source": None,
        }
    listing = "\n".join(f"[{c.chunk_id}] {c.content[:400]}" for c in chunks)
    lang = LANG_NAMES.get(reply_language, "français")
    messages = [
        {"role": "system", "content": PEER_SYSTEM.format(lang=lang)},
        {"role": "user", "content": f"Extraits:\n{listing}\n\nExplication de l'élève: {explanation}"},
    ]
    if fair and (wait := fair.take(learner_id)) > 0:
        raise CapacityUnavailable(wait)
    result = await client.call(Tier.COMPACT, messages, 350, json_mode=True)
    trace.llm("peer_check", result)
    try:
        data = json.loads(result.completion.text)
        verdict = data["verdict"] if data.get("verdict") in VERDICTS else "unknown"
        question = str(data.get("guiding_question", ""))
    except (json.JSONDecodeError, KeyError, TypeError, AttributeError):
        return {
            "verdict": "unknown",
            "issue": "",
            "guiding_question": NOT_IN_COURSE.get(reply_language, NOT_IN_COURSE["fr"]),
            "missing_points": [],
            "restate_prompt": "",
            "source": None,
        }
    by_id = {c.chunk_id: c for c in chunks}
    cited = by_id.get(chunk_ref(data.get("chunk_id")))
    if cited is None:
        verdict = "unknown"
    raw_points = data.get("missing_points")
    points = (
        [p[:200] for p in raw_points if isinstance(p, str) and p.strip()][:3]
        if isinstance(raw_points, list) and verdict not in ("unknown", "correct")
        else []
    )
    return {
        "verdict": verdict,
        "issue": str(data.get("issue", "")) if verdict in ("incomplete", "incorrect") else "",
        "guiding_question": question,
        "missing_points": points,
        "restate_prompt": str(data.get("restate_prompt", "")) if verdict != "unknown" else "",
        "source": {"chunk_id": cited.chunk_id, "source": cited.source, "page": cited.page} if cited else None,
    }
