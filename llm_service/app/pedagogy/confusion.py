import re

from app.cache.store import normalize

CONFUSION_MARKERS = [
    # fr
    "je comprends pas",
    "je ne comprends pas",
    "j'ai pas compris",
    "pas compris",
    "c'est flou",
    # en
    "i don't get it",
    "i dont get it",
    "i don't understand",
    "confused",
    "makes no sense",
    # darija, latin script
    "ma fhemtch",
    "ma fhemtech",
    "mafhemtch",
    "mafhemtech",
    "ma fhmtch",
    "ma 9dertch nefhem",
    # darija / arabic, arabic script
    "ما فهمتش",
    "مافهمتش",
    "لم أفهم",
    "ما فهمت",
]
HINT_REQUESTS = ["indice", "hint", "aide-moi", "help me", "a3tini indice", "عاوني", "next", "suivant"]

_DARIJA_LATIN = re.compile(r"\b(chnowa|chnou|kifech|kifach|3lech|nheb|n7eb|barcha|mta3|fama|ya5i|9adech)\b")
_ARABIC = re.compile(r"[؀-ۿ]")
_ARABIZI_DIGITS = re.compile(r"[a-z][379][a-z]")


def is_confused(message: str) -> bool:
    m = normalize(message)
    return any(marker in m for marker in CONFUSION_MARKERS)


def wants_hint(message: str) -> bool:
    m = normalize(message)
    return any(marker in m for marker in HINT_REQUESTS)


def guess_language(message: str) -> str | None:
    """Cheap guess; None means 'let the compact triage decide'."""
    m = normalize(message)
    if _DARIJA_LATIN.search(m) or _ARABIZI_DIGITS.search(m):
        return "darija"
    if _ARABIC.search(m):
        return None  # MSA vs Darija in Arabic script needs the model
    return None
