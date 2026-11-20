from pathlib import Path

from app.agent.tools import Chunk

PROMPTS = Path(__file__).with_name("prompts")
LANG_NAMES = {"fr": "français", "en": "English", "ar": "العربية الفصحى"}
SUBJECT_NAMES = {
    "math": "Mathématiques", "svt": "Sciences de la vie et de la Terre (SVT)",
    "physics": "Physique", "chemistry": "Chimie", "french": "Français",
    "english": "Anglais", "history": "Histoire", "geography": "Géographie",
    "philosophy": "Philosophie", "computer_science": "Informatique",
}
NOT_FOUND = {
    "fr": "Je n'ai pas trouvé ça dans ton cours",
    "en": "I couldn't find this in your course",
    "ar": "لم أجد هذا في درسك",
}
ALT_STYLE = {
    "step_by_step": "un exemple concret",
    "examples": "des étapes numérotées",
    "visual": "des étapes numérotées",
    "analogy": "un exemple chiffré",
}
# The system prompt is French, so a small model answers French to an English or Arabic question.
# The reminder is written in the reply language and sits last, next to the question.
LANGUAGE_REMINDER = {"en": "Answer in English only.", "ar": "أجب بالعربية فقط."}
MAX_TOKENS = {
    "explanation": 450,
    "explanation_confused": 450,
    "direct_answer": 300,
    "not_found": 250,
    "clarify": 120,
    "multi_search": 700,
    "hint_ladder": 700,
    "quiz": 850,
}


def evidence_keys(chunks: list[Chunk]) -> dict[str, str]:
    """chunk_id -> short key. A small model miscopies long chunk ids, so the prompt names excerpts E1, E2..."""
    return {c.chunk_id: f"E{i}" for i, c in enumerate(chunks, 1)}


def template(name: str) -> str:
    return (PROMPTS / f"{name}.txt").read_text(encoding="utf-8")


def build_messages(
    task: str,
    question: str,
    *,
    level: str,
    reply_language: str,
    style: str,
    chunks: list[Chunk],
    history_summary: str = "",
    subject: str | None = None,
    short_keys: bool = False,
    language_reminder: bool = False,
) -> list[dict]:
    subject_name = SUBJECT_NAMES.get(subject)
    shared = template("_shared").format(
        level=level,
        reply_language_name=LANG_NAMES.get(reply_language, "français"),
        style=style,
        max_sentences=10 if task == "multi_search" or subject_name else 6,
        cite_example="[[E1]]" if short_keys else "[[math_4sc_derivee_001]]",
    )
    body = template(task).format(
        alt_style=ALT_STYLE.get(style, "un exemple concret"),
        not_found_line=NOT_FOUND.get(reply_language, NOT_FOUND["fr"]),
    )
    if subject_name:
        shared += (
            f"\nMatière choisie : {subject_name}. Adapte le vocabulaire et les exemples à cette matière. "
            "Aide l'élève à comprendre le raisonnement. Respecte le format demandé : explication simple "
            "ou détaillée, exemple, étapes, résumé de révision ou exercice pour s'entraîner. "
            "Pour du code, utilise un bloc de code Markdown."
        )
        if task == "not_found":
            body += (
                "\nAprès avoir signalé l'absence de source, réponds utilement à la demande avec une "
                "explication générale clairement séparée du cours. Pour un exercice demandé, propose "
                "un énoncé original et invite l'élève à essayer avant de donner la correction."
            )
    keys = evidence_keys(chunks) if short_keys else {}
    context = "\n".join(
        f"[[{keys.get(c.chunk_id, c.chunk_id)}]] ({c.source}, p.{c.page}) {c.content}" for c in chunks
    )
    user = (
        f"Historique: {history_summary or '(vide)'}\n"
        f"Extraits:\n{context or '(aucun)'}\n\nQuestion de l'élève: {question}"
    )
    if language_reminder and reply_language in LANGUAGE_REMINDER:
        user += f"\n{LANGUAGE_REMINDER[reply_language]}"
    return [{"role": "system", "content": f"{shared}\n{body}"}, {"role": "user", "content": user}]


def shrink(messages: list[dict], max_tokens: int) -> tuple[list[dict], int]:
    """Used after a 400: halve the context block and the answer budget."""
    reduced = messages.copy()
    for i, message in enumerate(messages):
        if message["role"] != "user" or "Extraits:\n" not in message["content"]:
            continue
        head, marker, rest = message["content"].partition("Extraits:\n")
        context, sep, tail = rest.partition("\n\nQuestion de l'élève:")
        lines = context.splitlines()
        kept = "\n".join(lines[: max(1, len(lines) // 2)])
        reduced[i] = {**message, "content": f"{head}{marker}{kept}{sep}{tail}"}
        break
    return reduced, max(1, max_tokens // 2)
