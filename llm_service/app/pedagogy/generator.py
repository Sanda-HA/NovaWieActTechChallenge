from pathlib import Path

from app.agent.tools import Chunk

PROMPTS = Path(__file__).with_name("prompts")
LANG_NAMES = {"fr": "français", "en": "English"}
SUBJECT_NAMES = {
    "math": "Mathématiques", "svt": "Sciences de la vie et de la Terre (SVT)",
    "physics": "Physique", "chemistry": "Chimie", "french": "Français",
    "english": "Anglais", "history": "Histoire", "geography": "Géographie",
    "philosophy": "Philosophie", "computer_science": "Informatique",
}
NOT_FOUND = {"fr": "Je n'ai pas trouvé ça dans ton cours", "en": "I couldn't find this in your course"}
ALT_STYLE = {
    "step_by_step": "un exemple concret",
    "examples": "des étapes numérotées",
    "visual": "des étapes numérotées",
    "analogy": "un exemple chiffré",
}
MAX_TOKENS = {
    "explanation": 450,
    "explanation_confused": 450,
    "direct_answer": 300,
    "not_found": 250,
    "clarify": 120,
    "multi_search": 700,
    "hint_ladder": 700,
}


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
) -> list[dict]:
    subject_name = SUBJECT_NAMES.get(subject)
    shared = template("_shared").format(
        level=level,
        reply_language_name=LANG_NAMES.get(reply_language, "français"),
        style=style,
        max_sentences=10 if task == "multi_search" or subject_name else 6,
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
    context = "\n".join(f"[[{c.chunk_id}]] ({c.source}, p.{c.page}) {c.content}" for c in chunks)
    user = (
        f"Historique: {history_summary or '(vide)'}\n"
        f"Extraits:\n{context or '(aucun)'}\n\nQuestion de l'élève: {question}"
    )
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
