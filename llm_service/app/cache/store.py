import hashlib
import json
import re
import sqlite3
import unicodedata

PROMPT_VERSION = "v2"  # bump when any prompt template changes, so old answers stop being served

_PUNCT_EDGES = re.compile(r"^[\s\"'«»]+|[\s\"'«»?!.…؟]+$")
_SPACES = re.compile(r"\s+")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = _SPACES.sub(" ", text)
    return _PUNCT_EDGES.sub("", text)


def _digest(parts: dict) -> str:
    parts = {**parts, "pv": PROMPT_VERSION}
    return hashlib.sha256(json.dumps(parts, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def exact_key(
    message: str,
    mode: str,
    level: str,
    reply_language: str,
    style: str,
    *,
    grade: str = "4eme_annee_secondaire",
    section: str = "mathematiques",
    subject: str = "math",
) -> str:
    """Only standalone questions are ever stored under this key (triage decides), so a follow-up
    such as "et pourquoi ?" can never be answered from another conversation."""
    return "x:" + _digest(
        {
            "m": normalize(message),
            "mode": mode,
            "lvl": level,
            "lang": reply_language,
            "style": style,
            "grade": grade,
            "section": section,
            "subject": subject,
        }
    )


def evidence_key(
    action: str,
    topic: str,
    mode: str,
    level: str,
    reply_language: str,
    style: str,
    chunk_ids: list[str],
    query: str,
    *,
    grade: str = "4eme_annee_secondaire",
    section: str = "mathematiques",
    subject: str = "math",
) -> str:
    return "e:" + _digest(
        {
            "a": action,
            "t": topic,
            "mode": mode,
            "lvl": level,
            "lang": reply_language,
            "style": style,
            "c": sorted(chunk_ids),
            "q": normalize(query),
            "grade": grade,
            "section": section,
            "subject": subject,
        }
    )


def ladder_key(
    exercise: str,
    level: str,
    reply_language: str,
    style: str,
    *,
    grade: str = "4eme_annee_secondaire",
    section: str = "mathematiques",
    subject: str = "math",
    chunk_ids: list[str] | None = None,
) -> str:
    """A hint ladder belongs to one exercise statement: two different exercises never share one."""
    return "l:" + _digest(
        {
            "ex": normalize(exercise),
            "lvl": level,
            "lang": reply_language,
            "style": style,
            "grade": grade,
            "section": section,
            "subject": subject,
            "chunks": sorted(chunk_ids or []),
        }
    )


def quiz_key(
    topic: str,
    reply_language: str,
    *,
    grade: str = "4eme_annee_secondaire",
    section: str = "mathematiques",
    subject: str = "math",
    chunk_ids: list[str] | None = None,
) -> str:
    return "q:" + _digest(
        {
            "t": topic,
            "lang": reply_language,
            "grade": grade,
            "section": section,
            "subject": subject,
            "chunks": sorted(chunk_ids or []),
        }
    )


class CacheStore:
    def __init__(self, path: str):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS cache (k TEXT PRIMARY KEY, v TEXT NOT NULL, hits INTEGER DEFAULT 0)"
        )
        self.db.commit()

    def get(self, key: str) -> dict | None:
        row = self.db.execute("SELECT v FROM cache WHERE k = ?", (key,)).fetchone()
        if row is None:
            return None
        self.db.execute("UPDATE cache SET hits = hits + 1 WHERE k = ?", (key,))
        self.db.commit()
        return json.loads(row[0])

    def put(self, key: str, value: dict) -> None:
        self.db.execute(
            "INSERT OR REPLACE INTO cache (k, v) VALUES (?, ?)", (key, json.dumps(value, ensure_ascii=False))
        )
        self.db.commit()

    def delete(self, keys: list[str]) -> int:
        n = 0
        for k in keys:
            n += self.db.execute("DELETE FROM cache WHERE k = ?", (k,)).rowcount
        self.db.commit()
        return n


class RedisCacheStore:
    """Shared cache for multiple agent workers."""

    def __init__(self, url: str):
        import redis

        self.redis = redis.Redis.from_url(url, decode_responses=True)
        self.redis.ping()

    def get(self, key: str) -> dict | None:
        raw = self.redis.get(f"ednova:cache:{key}")
        if raw is None:
            return None
        self.redis.hincrby("ednova:cache:hits", key, 1)
        return json.loads(raw)

    def put(self, key: str, value: dict) -> None:
        self.redis.set(f"ednova:cache:{key}", json.dumps(value, ensure_ascii=False))

    def delete(self, keys: list[str]) -> int:
        if not keys:
            return 0
        names = [f"ednova:cache:{key}" for key in keys]
        return self.redis.delete(*names)
