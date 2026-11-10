"""Bilingual (FR / AR / EN) term glossary and Derja normalisation.

Goal (plan, "Bilingual term glossary" and "Derja queries"): a question in one language retrieves
a chunk written in the other, and Derja questions are normalised to French/Arabic BEFORE retrieval.
"""
import json
import re

from app import config
from app.embeddings import STOPWORDS, normalize_text, tokenize

_CACHE = {}


def get_glossary(path=None):
    path = path or config.GLOSSARY_PATH
    key = str(path)
    if key in _CACHE:
        return _CACHE[key]
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    entries = []
    for entry in raw["concepts"]:
        terms = []
        for lang in ("fr", "ar", "en"):
            for term in entry.get(lang, []):
                toks = tokenize(term, drop_stop=False)
                if toks:
                    terms.append({"raw": term, "lang": lang, "tokens": toks})
        entries.append({"id": entry["id"], "terms": terms})
    derja = {normalize_text(k): v for k, v in raw.get("derja_words", {}).items()}
    glo = {"entries": entries, "derja": derja}
    _CACHE[key] = glo
    return glo


def find_term(query_tokens, term_tokens):
    """Start index where term_tokens appear contiguously in query_tokens, else -1."""
    n, m = len(query_tokens), len(term_tokens)
    for start in range(n - m + 1):
        if all(query_tokens[start + j] == term_tokens[j] or
               (len(term_tokens[j]) >= 5 and query_tokens[start + j].startswith(term_tokens[j]))
               for j in range(m)):
            return start
    return -1


def normalize_derja(glo, question):
    """Replace known Derja (Arabizi) words by French equivalents; other words are untouched."""
    words = re.findall(r"[^\W_]+", normalize_text(question))
    return " ".join(glo["derja"].get(w, w) for w in words)


def analyze_query(glo, question, expand=True, derja=True, max_extra_terms=6):
    """Break a question into scoring units.

    Returns a dict:
      text       question after Derja normalisation
      leftover   content tokens not covered by a glossary concept
      concepts   [{id, matched_tokens, alternatives}]  alternatives = token lists in FR/AR/EN
      extra_terms raw cross-language terms to add to the query text
    """
    text = normalize_derja(glo, question) if derja else question
    all_tokens = tokenize(text, drop_stop=False)
    covered = set()
    concepts, extra_terms = [], []
    if expand:
        for entry in glo["entries"]:
            matched = None
            for term in entry["terms"]:
                start = find_term(all_tokens, term["tokens"])
                if start >= 0:
                    matched = (start, term)
                    break
            if matched is None:
                continue
            start, term = matched
            covered.update(range(start, start + len(term["tokens"])))
            concepts.append({
                "id": entry["id"],
                "matched_tokens": term["tokens"],
                "alternatives": [t["tokens"] for t in entry["terms"]],
            })
            present = set(all_tokens)
            for other in entry["terms"]:
                if other is term or all(tok in present for tok in other["tokens"]):
                    continue
                extra_terms.append(other["raw"])
    leftover = [tok for i, tok in enumerate(all_tokens) if i not in covered and tok not in STOPWORDS]
    return {"text": text, "leftover": leftover, "concepts": concepts, "extra_terms": extra_terms[:max_extra_terms * max(1, len(concepts))]}
