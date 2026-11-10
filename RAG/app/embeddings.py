"""Text normalisation, tokenisation and embeddings (plain functions, no classes).

Two backends:
  * "local"    : deterministic hashing embeddings (word unigrams, bigrams, char n-grams).
                 Offline, free, no quota. It is LEXICAL, not semantic: it does not link
                 "dérivée" to "مشتق" by itself (the glossary does that).
  * "platform" : the organisers' OpenAI-compatible /v1/embeddings endpoint. Handles the
                 resilience contract (429/503 -> wait and retry, 400 -> shrink the request).
"""
import re
import time
import unicodedata
import zlib

import numpy as np
import requests

from app import config

# ---------------------------------------------------------------- normalisation


def normalize_text(text):
    """Lowercase, unify quotes/minus signs, strip Latin accents and Arabic diacritics."""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("−", "-").replace("’", "'").replace("‘", "'").replace("′", "'")
    text = text.lower()
    text = re.sub("[ً-ْـ]", "", text)          # tashkeel + tatweel
    text = re.sub("[أإآ]", "ا", text)      # alef variants -> alef
    text = text.replace("ى", "ي").replace("ة", "ه")   # alef maqsura, ta marbuta
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text


_STOP_RAW = """
le la les un une des de du d l et ou en au aux a est sont que qui quoi quel quelle quels quelles ce cet cette ces
dans pour par sur avec sans se sa son ses on il elle ils elles je tu nous vous mon ma mes ton ta tes ne pas plus
comment pourquoi quand donne moi explique ca cela ceci y fait faut peut etre ete avoir qu est-ce
the of an is are what how to in and for with why when give me explain this that it
في من على إلى عن ما هو هي ماذا كيف هل أن التي الذي هذا هذه مع أو و لماذا متى أعط اشرح
"""
STOPWORDS = {normalize_text(w) for w in _STOP_RAW.split()}


def tokenize(text, drop_stop=True):
    """Unicode word tokens; single letters are dropped (they are noise in formulas), digits kept."""
    tokens = re.findall(r"[^\W_]+", normalize_text(text))
    out = []
    for tok in tokens:
        if len(tok) == 1 and not tok.isdigit():
            continue
        if tok.startswith("ال") and len(tok) > 4:   # Arabic definite article "ال"
            tok = tok[2:]
        elif len(tok) > 4 and tok.isascii() and tok.endswith("s"):   # light plural stemming (fonctions -> fonction)
            tok = tok[:-1]
        if drop_stop and tok in STOPWORDS:
            continue
        out.append(tok)
    return out


# ---------------------------------------------------------------- local backend


def _hash_feature(feature, dim):
    h = zlib.crc32(feature.encode("utf-8"))
    return h % dim, (1.0 if (h >> 16) & 1 else -1.0)


def embed_local(text, dim):
    tokens = tokenize(text)
    features = {}
    for tok in tokens:
        features["w:" + tok] = features.get("w:" + tok, 0.0) + 1.0
    for a, b in zip(tokens, tokens[1:]):
        features["b:" + a + "_" + b] = features.get("b:" + a + "_" + b, 0.0) + 0.7
    for tok in tokens:
        if len(tok) >= 4:
            padded = "<" + tok + ">"
            for n in (3, 4):
                for i in range(len(padded) - n + 1):
                    key = "c:" + padded[i:i + n]
                    features[key] = features.get(key, 0.0) + 0.35
    vec = np.zeros(dim, dtype=np.float32)
    for feat, weight in features.items():
        idx, sign = _hash_feature(feat, dim)
        vec[idx] += sign * (1.0 + np.log(weight) if weight >= 1.0 else weight)
    norm = float(np.linalg.norm(vec))
    return vec / norm if norm > 0 else vec


# ---------------------------------------------------------------- platform backend

STATS = {"platform_calls": 0}      # successful HTTP calls to the embeddings endpoint (quota tracking)


def _retry_delay(resp, attempt):
    header = resp.headers.get("Retry-After")
    if header:
        try:
            return min(max(float(header), 0.5), config.EMBED_RETRY_MAX_DELAY)
        except ValueError:
            pass
    try:
        body = resp.json()
        for key in ("retry_after", "retry_after_seconds", "delay"):
            if isinstance(body, dict) and key in body:
                return min(max(float(body[key]), 0.5), config.EMBED_RETRY_MAX_DELAY)
    except Exception:
        pass
    return min(2.0 * attempt, config.EMBED_RETRY_MAX_DELAY)


def embed_platform(texts):
    """Batch embeddings through the platform. The key is read from the environment only."""
    if not config.PLATFORM_BASE_URL or not config.PLATFORM_API_KEY or not config.EMBED_MODEL:
        raise RuntimeError("PLATFORM_BASE_URL, PLATFORM_API_KEY and EMBED_MODEL must be set for the platform backend")
    url = config.PLATFORM_BASE_URL.rstrip("/") + "/v1/embeddings"
    headers = {"Authorization": "Bearer " + config.PLATFORM_API_KEY, "Content-Type": "application/json"}
    texts = list(texts)
    vectors = []
    i = 0
    batch = max(1, config.EMBED_BATCH_SIZE)
    attempt = 0
    while i < len(texts):
        chunk = texts[i:i + batch]
        resp = requests.post(url, headers=headers, json={"model": config.EMBED_MODEL, "input": chunk}, timeout=60)
        if resp.status_code == 200:
            STATS["platform_calls"] += 1
            rows = sorted(resp.json()["data"], key=lambda r: r["index"])
            vectors.extend(r["embedding"] for r in rows)
            i += len(chunk)
            attempt = 0
        elif resp.status_code in (429, 503):          # quota exhausted / class saturated: wait the stated delay
            attempt += 1
            if attempt > config.EMBED_MAX_RETRIES:
                raise RuntimeError("Embeddings endpoint still unavailable after retries (HTTP %d)" % resp.status_code)
            time.sleep(_retry_delay(resp, attempt))
        elif resp.status_code == 400:                  # request beyond a ceiling: shrink it
            if batch > 1:
                batch = max(1, batch // 2)
            elif len(texts[i]) > 50:
                texts[i] = texts[i][: len(texts[i]) // 2]
            else:
                raise RuntimeError("Embeddings endpoint rejected even a minimal request (HTTP 400)")
        else:
            raise RuntimeError("Embeddings endpoint error (HTTP %d)" % resp.status_code)
    mat = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms


# ---------------------------------------------------------------- public API

_QUERY_CACHE = {}


def embed_texts(texts, backend=None, dim=None):
    backend = backend or config.EMBED_BACKEND
    if backend == "platform":
        return embed_platform(texts)
    dim = dim or config.EMBED_DIM_LOCAL
    return np.stack([embed_local(t, dim) for t in texts]) if texts else np.zeros((0, dim), dtype=np.float32)


def embed_query(text, backend=None, dim=None):
    """One query embedding, cached (repeated questions cost no embedding call)."""
    backend = backend or config.EMBED_BACKEND
    key = (backend, dim, text)
    if key not in _QUERY_CACHE:
        if len(_QUERY_CACHE) > 2000:
            _QUERY_CACHE.clear()
        _QUERY_CACHE[key] = embed_texts([text], backend, dim)[0]
    return _QUERY_CACHE[key]
