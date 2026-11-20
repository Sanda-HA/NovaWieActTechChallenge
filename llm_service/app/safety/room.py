"""Shared-room boundaries for user context and proposed tutor text."""

import re
import unicodedata

from app.safety.privacy import is_distress, redact

_PRIVATE_OR_UNSAFE = re.compile(
    r"@|(?:https?|ftp|mailto)\s*:|\bwww[.\u3002]"
    r"|\b[\w-]+(?:[.\u3002][\w-]+)*[.\u3002][a-z]{2,24}(?![\w-])"
    r"|\[(?:e-?mail|tel|prénom|at|dot)\]|\[[^]]+\]\s*\(|<\|"
    r"|<(?:/?[a-z][a-z0-9:-]*(?:[ \t][^<>\n]*)?/?|![^<>]*)>"
    r"|\b(?:my address|my (?:phone|number|email|username|handle)|call me at|(?:contact|message|follow) me"
    r"|mon (?:numéro|adresse|prénom|nom|pseudo)|ma (?:ville|rue|maison|classe)|j['’]habite"
    r"|(?:contactez|appelez|écrivez|rejoignez)[-\s]moi|instagram|whatsapp|telegram|snapchat|tiktok|discord)\b"
    r"|(?:اسمي|عنواني|رقمي|اتصل بي|تواصل.{0,10}معي|واتساب|إنستغرام|انستغرام|تيليغرام)"
    r"|\b(?:kill yourself|i(?:'ll| will) kill you|you(?: are|'re) (?:such an? |an? |so )?"
    r"(?:idiot|stupid|loser|worthless)|fuck you|shut up|tu es (?:un |une )?(?:idiot|imbécile|stupide)"
    r"|tais-toi|je vais te tuer|connard|connasse|salope|crève)\b"
    r"|(?:سأقتلك|اقتل نفسك|أنت غبي|أنت غبية|يا غبي|يا غبية|يا حمار)"
    r"|\b(?:ignore|disregard|override|forget|ignorer?|oublie[zr]?)\b.{0,75}"
    r"\b(?:instructions?|rules|prompt|consignes?)\b"
    r"|\b(?:system prompt|developer message|prompt système)\b"
    r"|(?im:^\s*(?:system|assistant|developer|système)\s*:)",
    re.IGNORECASE,
)

_ATTRIBUTION = re.compile(
    r'["\u00ab\u00bb\u201c\u201d\u201e]|(?m:^\s*>)'
    r"|\b(?:an?|one|the|this) (?:student|learner|member|participant)\b"
    r"|\b(?:someone|somebody) (?:said|wrote|mentioned|asked)\b"
    r"|\b(?:un|une|l['’]|le|la) ?(?:élève|membre|participant(?:e)?)\b"
    r"|\b(?:you (?:said|wrote|mentioned|asked)|vous avez (?:dit|écrit|demandé))\b"
    r"|\b[A-ZÀ-Ý][a-zà-ÿ]+ (?:said|wrote|asked|a dit|a écrit|a demandé)\b"
    r"|(?:(?:أحد|احد) (?:الأعضاء|الطلاب|المشاركين)|(?:قال|كتب|سأل) (?:المشارك|الطالب|العضو))",
    re.IGNORECASE,
)
_ARABIC_MARKS = re.compile("[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]")


def _screening_form(text: str) -> str:
    return _ARABIC_MARKS.sub("", unicodedata.normalize("NFKC", text))


def safe_room_text(text: str) -> str | None:
    text = text.strip()
    if not any(c.isalnum() for c in text):
        return None
    if any(unicodedata.category(c).startswith("C") and c not in "\n\r\t" for c in text):
        return None
    screen = _screening_form(text)
    if is_distress(screen) or redact(screen)[1] or _PRIVATE_OR_UNSAFE.search(screen):
        return None
    return text


def safe_room_output(text: str, context: list[str]) -> str | None:
    text = safe_room_text(text)
    if text is None:
        return None
    screen = _screening_form(text)
    if _ATTRIBUTION.search(screen):
        return None
    rendered = " " + " ".join(re.findall(r"\w+", screen.casefold())) + " "
    for entry in context:
        words = re.findall(r"\w+", _screening_form(entry).casefold())
        if len(words) >= 5 and f" {' '.join(words)} " in rendered:
            return None
        if any(f" {' '.join(words[i:i + 7])} " in rendered for i in range(len(words) - 6)):
            return None
    return text
