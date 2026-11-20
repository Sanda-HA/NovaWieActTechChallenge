import json
import sqlite3
import time
from collections import Counter, deque
from dataclasses import asdict, dataclass, field

MAX_MISTAKES = 20
STYLES = ["step_by_step", "examples", "visual", "analogy"]


class LearnerDeleted(Exception):
    def __init__(self):
        super().__init__("learner deleted")


@dataclass
class TopicStats:
    attempts: int = 0
    solved: int = 0
    hints_used: int = 0
    confusions: int = 0

    @property
    def mastery(self) -> float | None:
        """0..1, None without evidence. Hint use does not lower mastery."""
        if self.attempts == 0 and self.confusions == 0:
            return None
        base = self.solved / self.attempts if self.attempts else 0.5
        penalty = 0.1 * self.confusions
        return round(max(0.0, min(1.0, base - min(penalty, 0.5))), 2)


@dataclass
class Profile:
    weights: dict[str, float] = field(default_factory=lambda: {s: 1.0 for s in STYLES})
    level_estimate: str = "unknown"
    diagnosed: bool = False
    topics: dict[str, TopicStats] = field(default_factory=dict)
    diagnostic_score: int | None = None
    subtopics: dict[str, TopicStats] = field(default_factory=dict)
    mistakes: list[dict] = field(default_factory=list)

    @property
    def style(self) -> str:
        return max(self.weights, key=self.weights.get)

    def reward(self, style: str, amount: float = 1.0) -> None:
        self.weights[style] = self.weights.get(style, 0.0) + amount

    def penalize(self, style: str) -> None:
        self.weights[style] = self.weights.get(style, 1.0) - 0.5

    def topic(self, slug: str) -> TopicStats:
        return self.topics.setdefault(slug, TopicStats())

    def subtopic(self, slug: str) -> TopicStats:
        return self.subtopics.setdefault(slug, TopicStats())

    def record_mistake(self, topic: str, subtopic: str | None, kind: str, ts: float | None = None) -> None:
        stamp = time.time() if ts is None else ts
        self.mistakes.append({"topic": topic, "subtopic": subtopic, "type": kind, "ts": stamp})
        del self.mistakes[:-MAX_MISTAKES]

    def to_json(self) -> str:
        return json.dumps(
            {
                "weights": self.weights,
                "level_estimate": self.level_estimate,
                "diagnosed": self.diagnosed,
                "diagnostic_score": self.diagnostic_score,
                "subtopics": {k: asdict(v) for k, v in self.subtopics.items()},
                "topics": {k: asdict(v) for k, v in self.topics.items()},
                "mistakes": self.mistakes,
            }
        )

    @classmethod
    def from_json(cls, raw: str) -> "Profile":
        d = json.loads(raw)
        return cls(
            d["weights"], d["level_estimate"], d["diagnosed"], {k: TopicStats(**v) for k, v in d["topics"].items()},
            d.get("diagnostic_score"),
            {k: TopicStats(**v) for k, v in d.get("subtopics", {}).items()},
            d.get("mistakes", []),
        )


@dataclass
class Ladder:
    final_answer: str
    rungs: list[str]
    topic: str = "autre"
    next: int = 0
    subtopic: str | None = None

    def take(self) -> tuple[int, str]:
        i = min(self.next, len(self.rungs) - 1)
        self.next = i + 1
        return i, self.rungs[i]

    @property
    def hints_used(self) -> int:
        return max(0, self.next - 1)

    @property
    def done(self) -> bool:
        return self.next >= len(self.rungs)


@dataclass
class Session:
    """Conversation state lives in memory only, by design: nothing a student wrote is stored on disk."""

    history: deque = field(default_factory=lambda: deque(maxlen=6))
    ladder: Ladder | None = None
    ladder_key: str | None = None
    last_style: str | None = None
    topic_asks: Counter = field(default_factory=Counter)

    def summary(self) -> str:
        return " | ".join(f"{role}: {text[:120]}" for role, text in self.history)


class SessionStore:
    def __init__(self):
        self._s: dict[str, Session] = {}

    def get(self, session_id: str) -> Session:
        return self._s.setdefault(session_id, Session())

    def discard(self, session_ids: list[str]) -> None:
        for session_id in session_ids:
            self._s.pop(session_id, None)

    def invalidate_ladders(self, keys: list[str]) -> None:
        for session in self._s.values():
            if session.ladder_key in keys:
                session.ladder = None
                session.ladder_key = None


class RedisSessionStore:
    """Shared conversation state for multiple agent workers."""

    def __init__(self, url: str, ttl_seconds: int = 24 * 60 * 60):
        import redis

        self.redis = redis.Redis.from_url(url, decode_responses=True)
        self.redis.ping()
        self.ttl_seconds = ttl_seconds

    def _key(self, session_id: str) -> str:
        return f"ednova:session:{session_id}"

    def get(self, session_id: str) -> Session:
        raw = self.redis.get(self._key(session_id))
        if raw is None:
            session = Session()
        else:
            data = json.loads(raw)
            ladder = Ladder(**data["ladder"]) if data.get("ladder") else None
            session = Session(
                history=deque(data.get("history", []), maxlen=6),
                ladder=ladder,
                ladder_key=data.get("ladder_key"),
                last_style=data.get("last_style"),
                topic_asks=Counter(data.get("topic_asks", {})),
            )
        return session

    def save(self, session_id: str, session: Session) -> None:
        data = {
            "history": list(session.history),
            "ladder": asdict(session.ladder) if session.ladder else None,
            "ladder_key": session.ladder_key,
            "last_style": session.last_style,
            "topic_asks": dict(session.topic_asks),
        }
        self.redis.setex(self._key(session_id), self.ttl_seconds, json.dumps(data, ensure_ascii=False))

    def discard(self, session_ids: list[str]) -> None:
        keys = [self._key(session_id) for session_id in session_ids]
        if keys:
            self.redis.delete(*keys)

    def invalidate_ladders(self, keys: list[str]) -> None:
        for raw_key in self.redis.scan_iter(match="ednova:session:*"):
            raw = self.redis.get(raw_key)
            if not raw:
                continue
            data = json.loads(raw)
            if data.get("ladder_key") in keys:
                data["ladder"] = None
                data["ladder_key"] = None
                self.redis.setex(raw_key, self.ttl_seconds, json.dumps(data, ensure_ascii=False))


class LearnerStore:
    """Persists only the pseudonymous profile: style weights, level estimate, per-topic counters."""

    def __init__(self, path: str):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS learners (id TEXT PRIMARY KEY, profile TEXT NOT NULL)")
        self.db.commit()
        self._live: dict[str, Profile] = {}
        self._deleted: set[str] = set()

    def ensure_active(self, learner_id: str) -> None:
        if learner_id in self._deleted:
            raise LearnerDeleted()

    def delete(self, learner_id: str) -> None:
        self._deleted.add(learner_id)
        self._live.pop(learner_id, None)
        self.db.execute("DELETE FROM learners WHERE id = ?", (learner_id,))
        self.db.commit()

    def get(self, learner_id: str) -> Profile:
        self.ensure_active(learner_id)
        if learner_id not in self._live:
            row = self.db.execute("SELECT profile FROM learners WHERE id = ?", (learner_id,)).fetchone()
            self._live[learner_id] = Profile.from_json(row[0]) if row else Profile()
        return self._live[learner_id]

    def save(self, learner_id: str) -> None:
        self.db.execute(
            "INSERT OR REPLACE INTO learners (id, profile) VALUES (?, ?)", (learner_id, self.get(learner_id).to_json())
        )
        self.db.commit()
