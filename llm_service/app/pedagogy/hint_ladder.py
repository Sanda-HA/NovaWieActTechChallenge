import json

from app.agent.tools import Chunk
from app.capacity.resilient import ResilientClient
from app.pedagogy.generator import MAX_TOKENS, build_messages
from app.providers.platform import Tier
from app.sessions import Ladder
from app.trace import Trace
from app.validation.validator import leaks_answer, matches_answer

SAFE_RUNGS = [
    "Qu'est-ce que l'énoncé te demande exactement ? Reformule-le avec tes mots.",
    "Quelle définition ou quel théorème du cours s'applique ici ?",
    "Écris la première ligne du calcul et montre-la-moi.",
]

GRADE_SYSTEM = (
    "Compare la réponse de l'élève au résultat attendu.\n"
    'Réponds UNIQUEMENT en JSON: {"correct": true|false, "feedback": "une phrase encourageante, '
    'sans donner le résultat", "mistake_type": "concept|calculation|notation|incomplete"}\n'
    "mistake_type nomme la nature de l'erreur si la réponse est fausse: concept (notion mal comprise), "
    "calculation (erreur de calcul), notation (écriture ou forme incorrecte), incomplete (réponse partielle)."
)
MISTAKE_TYPES = ("concept", "calculation", "notation", "incomplete")


def parse_ladder(text: str, topic: str = "autre") -> Ladder | None:
    try:
        data = json.loads(text)
        final, rungs = data["final_answer"], data["rungs"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return None
    if not isinstance(final, str) or not final.strip():
        return None
    if not isinstance(rungs, list) or len(rungs) != 4 or not all(isinstance(r, str) and r.strip() for r in rungs):
        return None
    for i in range(3):
        if leaks_answer(rungs[i], final):
            rungs[i] = SAFE_RUNGS[i]
    return Ladder(final, rungs, topic)


async def compile_ladder(
    question: str,
    chunks: list[Chunk],
    tier: Tier,
    *,
    topic: str,
    level: str,
    reply_language: str,
    style: str,
    client: ResilientClient,
    trace: Trace,
    subject: str | None = None,
) -> Ladder | None:
    messages = build_messages(
        "hint_ladder", question, level=level, reply_language=reply_language, style=style, chunks=chunks,
        subject=subject,
    )
    result = await client.call(tier, messages, MAX_TOKENS["hint_ladder"], json_mode=True)
    trace.llm("hint_ladder", result)
    return parse_ladder(result.completion.text, topic)


async def grade_attempt(
    attempt: str, ladder: Ladder, client: ResilientClient, trace: Trace
) -> tuple[bool | None, str, str | None]:
    if matches_answer(attempt, ladder.final_answer):
        trace.rule("grade_attempt", correct=True, by="exact_match")
        return True, "", None
    messages = [
        {"role": "system", "content": GRADE_SYSTEM},
        {"role": "user", "content": f"Attendu: {ladder.final_answer}\nÉlève: {attempt}"},
    ]
    result = await client.call(Tier.COMPACT, messages, 140, json_mode=True)
    try:
        data = json.loads(result.completion.text)
        correct = data.get("correct") if isinstance(data, dict) and type(data.get("correct")) is bool else None
        feedback = str(data.get("feedback", "")) if isinstance(data, dict) else ""
        kind = data.get("mistake_type") if isinstance(data, dict) else None
        mistake_type = kind if correct is False and isinstance(kind, str) and kind in MISTAKE_TYPES else None
    except (json.JSONDecodeError, KeyError, TypeError):
        correct, feedback, mistake_type = None, "", None
    trace.llm("grade_attempt", result, correct=correct)
    return correct, feedback, mistake_type
