"""Private, versioned maps for chapters with reviewed evidence."""

from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints, model_validator
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

from ..Database.core import DbSession
from ..ai.interface import Agent
from ..auth.exceptions import InvalidToken
from ..auth.services import CurrentUser
from ..contracts import SourceExcerpt
from ..student_plans import require_pro
from ..utils import learner_pseudonym
from .models import MindMap
from .services import get_or_create_profile

router = APIRouter(prefix="/learning/mind-maps", tags=["learning"])
GRADE, SECTION = "4eme_annee_secondaire", "sciences_experimentales"

Language = Literal["fr", "en", "ar"]
Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=72)]
Summary = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]
NodeId = Annotated[str, Field(pattern=r"^(root|b[1-5](?:-[1-2])?)$")]


@dataclass(frozen=True)
class Chapter:
    subject: Literal["math", "physics", "svt"]
    document_id: str
    titles: dict[str, str]
    source_revision: int = 1


CHAPTERS = {
    "limites_continuite": Chapter("math", "math_4eme_se_001", {
        "fr": "Continuité d’une fonction", "en": "Continuity of a function", "ar": "استمرارية دالة",
    }),
    "derivabilite": Chapter("math", "math_4eme_se_002", {
        "fr": "Dérivabilité", "en": "Differentiability", "ar": "الاشتقاقية",
    }),
    "probabilites": Chapter("math", "math_4eme_se_003", {
        "fr": "Probabilités", "en": "Probability", "ar": "الاحتمالات",
    }),
    "suites": Chapter("math", "math_4eme_se_004", {
        "fr": "Suites numériques", "en": "Numerical sequences", "ar": "المتتاليات العددية",
    }),
    "dipole_rc": Chapter("physics", "phys_4eme_se_001", {
        "fr": "Dipôle RC", "en": "RC circuit", "ar": "دارة RC",
    }),
    "immunite": Chapter("svt", "svt_4eme_se_101", {
        "fr": "Immunité", "en": "Immunity", "ar": "المناعة",
    }),
}


class MapNode(BaseModel):
    id: NodeId
    label: Label
    summary: Summary | None
    source_ids: list[str] = Field(max_length=2)
    children: list["MapNode"] = Field(max_length=5)


class MapSource(SourceExcerpt):
    language: Literal["fr"]
    excerpt: Annotated[str, Field(min_length=1, max_length=900)]
    source: Annotated[str, Field(min_length=1, max_length=300)]


class MapArtifact(BaseModel):
    root: MapNode
    sources: list[MapSource] = Field(min_length=3, max_length=8)

    @model_validator(mode="after")
    def check_tree(self):
        available = {source.chunk_id for source in self.sources}
        if len(available) != len(self.sources):
            raise ValueError("Duplicate sources")

        def visit(node, expected_id, depth):
            child_limit = (5, 2, 0)[depth]
            if node.id != expected_id or len(node.children) > child_limit:
                raise ValueError("Invalid node ID or tree depth")
            if depth == 0:
                if len(node.children) < 3 or node.summary is not None or node.source_ids:
                    raise ValueError("Invalid chapter root")
            elif not node.summary or not node.source_ids or not set(node.source_ids) <= available:
                raise ValueError("Missing node summary or source")
            if len(set(node.source_ids)) != len(node.source_ids):
                raise ValueError("Duplicate node sources")
            if len({child.label.casefold() for child in node.children}) != len(node.children):
                raise ValueError("Duplicate sibling labels")
            for index, child in enumerate(node.children, 1):
                child_id = f"b{index}" if depth == 0 else f"{node.id}-{index}"
                visit(child, child_id, depth + 1)

        visit(self.root, "root", 0)
        return self


class SavedMap(MapArtifact):
    topic: str
    subject: str
    reply_language: Language
    source_revision: int
    schema_version: Literal[1]
    generated_at: datetime


class MapResult(BaseModel):
    map: SavedMap | None = None
    update_available: bool = False


class ChapterOut(BaseModel):
    topic: str
    subject: str
    title: str


class ChapterList(BaseModel):
    chapters: list[ChapterOut]


def eligible(profile):
    return (profile.grade, profile.section) == (GRADE, SECTION)


def find_chapter(topic, profile):
    if not eligible(profile) or topic not in CHAPTERS:
        raise HTTPException(404, detail={"error": "not_in_course"})
    return CHAPTERS[topic]


def scope_for(user, profile, topic, chapter):
    return {
        "user_id": user.id, "grade": profile.grade, "section": profile.section,
        "subject": chapter.subject, "topic": topic, "reply_language": profile.reply_language,
    }


def result_for(saved, chapter):
    if saved is None:
        return MapResult()
    return MapResult(map=SavedMap(
        **saved.artifact, topic=saved.topic, subject=saved.subject, reply_language=saved.reply_language,
        generated_at=saved.generated_at, source_revision=saved.source_revision, schema_version=saved.schema_version,
    ), update_available=saved.source_revision < chapter.source_revision)


@router.get("", response_model=ChapterList)
def list_mind_maps(user: CurrentUser, db: DbSession):
    profile = get_or_create_profile(db, user)
    chapters = [
        ChapterOut(topic=topic, subject=chapter.subject, title=chapter.titles[profile.reply_language])
        for topic, chapter in CHAPTERS.items()
    ] if eligible(profile) else []
    return ChapterList(chapters=chapters)


@router.get("/{topic}", response_model=MapResult)
def read_mind_map(topic: str, user: CurrentUser, db: DbSession):
    profile = get_or_create_profile(db, user)
    chapter = find_chapter(topic, profile)
    return result_for(db.get(MindMap, scope_for(user, profile, topic, chapter)), chapter)


@router.post("/{topic}", response_model=MapResult)
async def generate_mind_map(topic: str, user: CurrentUser, db: DbSession, agent: Agent):
    profile = get_or_create_profile(db, user)
    require_pro(profile.student_plan, "mind_map")
    chapter = find_chapter(topic, profile)
    scope = scope_for(user, profile, topic, chapter)
    saved = db.get(MindMap, scope)
    if saved is not None and saved.source_revision >= chapter.source_revision:
        return result_for(saved, chapter)
    db.rollback()  # Release the connection before waiting for the agent.
    title = chapter.titles[scope["reply_language"]]
    payload = {key: value for key, value in scope.items() if key != "user_id"}
    body = await agent.mind_map({
        **payload, "learner_id": learner_pseudonym(scope["user_id"]), "title": title,
        "document_id": chapter.document_id, "source_revision": chapter.source_revision,
    })
    try:
        artifact = MapArtifact.model_validate(body)
        if artifact.root.label != title or any(
            not source.chunk_id.startswith(chapter.document_id + "_chunk_") for source in artifact.sources
        ):
            raise ValueError("Artifact outside requested chapter")
    except ValueError as exc:
        raise HTTPException(502, detail={"error": "agent_error"}) from exc

    stmt = insert(MindMap).values(
        **scope, source_revision=chapter.source_revision, schema_version=1, artifact=artifact.model_dump(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=list(scope),
        set_={
            "artifact": stmt.excluded.artifact,
            "source_revision": stmt.excluded.source_revision,
            "schema_version": stmt.excluded.schema_version,
            "generated_at": stmt.excluded.generated_at,
        },
        where=MindMap.source_revision < stmt.excluded.source_revision,
    )
    try:
        db.execute(stmt)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) == "fk_mind_maps_user":
            raise InvalidToken() from exc
        raise
    saved = db.get(MindMap, scope)
    if saved is None:
        raise InvalidToken()
    return result_for(saved, chapter)
