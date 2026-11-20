import json
from pathlib import Path

DEFAULT_PATH = Path(__file__).parent / "data" / "topics_math_bac.json"
UNKNOWN = "autre"


class TopicGraph:
    """Closed topic vocabulary: triage must pick from it, so caches and next steps line up."""

    def __init__(self, path: Path = DEFAULT_PATH):
        data = json.loads(path.read_text(encoding="utf-8"))
        self.topics = {t["slug"]: t for t in data["topics"]}
        self.subtopics = {t["slug"]: t for t in data.get("subtopics", [])}
        self.metadata = {k: data[k] for k in ("version", "status", "subject", "program") if k in data}

    def catalog(self) -> dict:
        return {"version": 1, **self.metadata, "topics": list(self.topics.values()),
                "subtopics": list(self.subtopics.values())}

    def valid_subtopic(self, slug: str | None, parent: str) -> bool:
        return self.subtopics.get(slug, {}).get("parent") == parent

    @property
    def slugs(self) -> list[str]:
        return list(self.topics)

    def known(self, slug: str) -> bool:
        return slug in self.topics

    def label(self, slug: str) -> str:
        return self.topics.get(slug, self.subtopics.get(slug, {})).get("label", slug)

    def prerequisites(self, slug: str) -> list[str]:
        return self.topics.get(slug, {}).get("prerequisites", [])

    def next(self, slug: str) -> list[str]:
        return self.topics.get(slug, {}).get("next", [])
