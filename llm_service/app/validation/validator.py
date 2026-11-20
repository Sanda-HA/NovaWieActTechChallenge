import re
from dataclasses import dataclass, field

from app.cache.store import normalize

CITATION = re.compile(r"\[\[([^\]]+)\]\]")
_ARABIC = re.compile(r"[؀-ۿ]")
_EN = re.compile(r"\b(the|is|and|of|you)\b")
_FR = re.compile(r"\b(le|la|est|et|une|des)\b")
_CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")
_MATH = re.compile(r"\$\$.*?\$\$|\$[^$]*\$|\\\(.*?\\\)|\\\[.*?\\\]", re.DOTALL)
_ARABIC_WORD = re.compile(r"[؀-ۿ]{2,}")
_LATIN_WORD = re.compile(r"[A-Za-zÀ-ÿ]{3,}")
_ECHO = re.compile(r"\n+[ \t]*(?:Question de l'élève|Historique|Extraits)[ \t]*:.*\Z", re.DOTALL)
_WORD = re.compile(r"\w{5,}")
_KEY = re.compile(r"E\d{1,2}", re.IGNORECASE)
_BRACKETED = re.compile(r"\[{1,2}\s*([^\[\]]+?)\s*\]{1,2}")


def chunk_ref(value) -> str:
    """A cited passage id as the model wrote it, minus the brackets the excerpt listing shows around it."""
    return value.strip().strip("[]").strip() if isinstance(value, str) else ""


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
    if reply_language == "ar":
        prose = _MATH.sub("", plain)
        latin = len(_LATIN_WORD.findall(prose))
        if latin >= 5 and len(_ARABIC_WORD.findall(prose)) < latin:
            problems.append("wrong_language:not_ar")
    elif len(_ARABIC.findall(plain)) > 0.3 * max(len(plain), 1):
        problems.append("wrong_language:ar")
    elif reply_language == "fr" and len(_EN.findall(plain.lower())) > 2 * len(_FR.findall(plain.lower())) + 2:
        problems.append("wrong_language:en")
    elif reply_language == "en" and len(_FR.findall(plain.lower())) > 2 * len(_EN.findall(plain.lower())) + 2:
        problems.append("wrong_language:fr")
    if _CJK.search(plain):
        problems.append("foreign_script")
    return Check(not problems, problems, [c for c in cited if c in allowed_ids])


def supporting_chunk(text: str, chunks: dict[str, str], min_shared: int = 3) -> str | None:
    """The excerpt an uncited answer most plausibly rests on, by words it shares with it, or None.

    A model that never writes a citation still often paraphrases the excerpt; with no shared wording the answer
    is not shown as coming from the course.
    """
    words = set(_WORD.findall(_MATH.sub(" ", text).casefold()))
    best_id, best = None, min_shared - 1
    for chunk_id, content in chunks.items():
        shared = len(words & set(_WORD.findall(_MATH.sub(" ", content).casefold())))
        if shared > best:
            best_id, best = chunk_id, shared
    return best_id


def strip_prompt_echo(text: str) -> str:
    """Drops a trailing copy of the prompt's own field labels, which a small model sometimes continues into."""
    return _ECHO.sub("", text).rstrip()


def resolve_keys(text: str, keys: dict[str, str]) -> str:
    """Rewrites the short evidence keys a model cites ("[[E1]]", "[E1]", "[[E1, E2]]") as `[[chunk_id]]`.

    `keys` maps chunk_id to its short key. Brackets holding anything else (intervals, full ids) are left alone.
    """
    by_key = {key.upper(): chunk_id for chunk_id, key in keys.items()}

    def rewrite(match: re.Match) -> str:
        parts = [p.strip() for p in match.group(1).split(",")]
        if not all(_KEY.fullmatch(p) and p.upper() in by_key for p in parts):
            return match.group(0)
        return "".join(f"[[{by_key[p.upper()]}]]" for p in parts)

    return _BRACKETED.sub(rewrite, text)


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
