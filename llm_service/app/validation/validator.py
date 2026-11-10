import re
from dataclasses import dataclass, field

from app.cache.store import normalize

CITATION = re.compile(r"\[\[([^\]]+)\]\]")
_ARABIC = re.compile(r"[؀-ۿ]")
_EN = re.compile(r"\b(the|is|and|of|you)\b")
_FR = re.compile(r"\b(le|la|est|et|une|des)\b")


@dataclass
class Check:
    ok: bool
    problems: list[str] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)


def check_answer(text: str, allowed_ids: set[str], reply_language: str, require_citation: bool) -> Check:
    problems = []
    cited = list(dict.fromkeys(CITATION.findall(text)))
    invented = [c for c in cited if c not in allowed_ids]
    if invented:
        problems.append(f"invented_citations:{','.join(invented)}")
    if require_citation and not cited:
        problems.append("missing_citation")
    if not text.strip():
        problems.append("empty")
    plain = CITATION.sub("", text)
    if len(_ARABIC.findall(plain)) > 0.3 * max(len(plain), 1):
        problems.append("wrong_language:ar")
    elif reply_language == "fr" and len(_EN.findall(plain.lower())) > 2 * len(_FR.findall(plain.lower())) + 2:
        problems.append("wrong_language:en")
    elif reply_language == "en" and len(_FR.findall(plain.lower())) > 2 * len(_EN.findall(plain.lower())) + 2:
        problems.append("wrong_language:fr")
    return Check(not problems, problems, [c for c in cited if c in allowed_ids])


def strip_invented(text: str, allowed_ids: set[str]) -> str:
    return CITATION.sub(lambda m: m.group(0) if m.group(1) in allowed_ids else "", text)


def matches_answer(text: str, final_answer: str) -> bool:
    text = normalize(text).replace("−", "-")
    final = normalize(final_answer).replace("−", "-")
    text = re.sub(r"^(?:donc|je trouve|i get|so)\s+", "", text)
    text = re.sub(r",\s*(?:bravo|ok)$", "", text)
    if re.fullmatch(r"[+-]?\s*\d+(?:[.,]\d+)?", final):
        text = re.sub(r"^[a-z]\s*=\s*", "", text)
    return bool(final and re.sub(r"\s+", "", text) == re.sub(r"\s+", "", final))


def leaks_answer(rung: str, final_answer: str) -> bool:
    text = normalize(rung).replace("−", "-")
    final = normalize(final_answer).replace("−", "-")
    text = re.sub(r"([+-])\s+(?=\d)", r"\1", text)
    return bool(final and re.search(r"(?<![\w\-+])(?<!\d[.,])" + re.escape(final) + r"(?!\w)(?![.,]\d)", text))
