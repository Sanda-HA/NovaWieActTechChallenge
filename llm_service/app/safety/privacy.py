"""Runs on every student message before it reaches the platform, the cache or the logs."""

import re

from app.cache.store import normalize

_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE = re.compile(r"(?<!\d)(?:\+?216[\s.-]?)?(?:\d[\s.-]?){8}(?!\d)")
_APOSTROPHES = str.maketrans("’‘ʼ", "'''")
_NAME_INTRO = re.compile(
    r"(je m'appelle|mon nom est|my name is|i am called|esmi|ismi|اسمي)\s+"
    r"([^\s,.!?]+(?:\s+(?-i:[A-ZÀ-Ý])[^\s,.!?]*)?)",
    re.IGNORECASE,
)


def redact(text: str) -> tuple[str, list[str]]:
    """Returns the cleaned text and the kinds of data removed (never the data itself)."""
    text = text.translate(_APOSTROPHES)
    found = []
    if _EMAIL.search(text):
        found.append("email")
        text = _EMAIL.sub("[email]", text)
    if _PHONE.search(text):
        found.append("phone")
        text = _PHONE.sub("[tel]", text)
    if _NAME_INTRO.search(text):
        found.append("name")
        text = _NAME_INTRO.sub(lambda m: f"{m.group(1)} [prénom]", text)
    return text, found


DISTRESS_MARKERS = [
    "je veux mourir",
    "envie de mourir",
    "me suicider",
    "suicide",
    "me faire du mal",
    "je n'en peux plus de vivre",
    "i want to die",
    "kill myself",
    "hurt myself",
    "end my life",
    "nheb nmout",
    "n7eb nmout",
    "bech nmout rou7i",
    "nqatel rou7i",
    "n9atel rou7i",
    "نحب نموت",
    "نقتل روحي",
    "أريد أن أموت",
    "انتحار",
]


def is_distress(text: str) -> bool:
    m = normalize(text.translate(_APOSTROPHES))
    return any(marker in m for marker in DISTRESS_MARKERS)


def wellbeing_message(reply_language: str, contact: str) -> str:
    if reply_language == "en":
        base = (
            "I'm really sorry you're feeling this way. You don't have to deal with it alone: please talk "
            "right now to someone you trust, a parent, a teacher or your school's counsellor."
        )
        extra = f" You can also contact: {contact}." if contact else ""
        return base + extra + " I'm here for your revision whenever you want to come back."
    base = (
        "Je suis vraiment désolé que tu te sentes comme ça. Tu n'as pas à gérer ça seul·e : parle dès maintenant "
        "à une personne de confiance, un parent, un enseignant ou le conseiller de ton lycée."
    )
    extra = f" Tu peux aussi contacter : {contact}." if contact else ""
    return base + extra + " Je reste là pour tes révisions quand tu veux revenir."
