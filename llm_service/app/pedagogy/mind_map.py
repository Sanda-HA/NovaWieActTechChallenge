"""Generate a small, cited map from the ordered excerpts of one verified chapter."""

import hashlib
import json
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, TypeAdapter, ValidationError

from app.cache.store import evidence_key, normalize
from app.capacity.resilient import CapacityUnavailable
from app.pedagogy.generator import LANG_NAMES
from app.pedagogy.quiz import NotInCourse
from app.trace import NO_CACHE_EVENTS

Slug = Annotated[str, Field(pattern=r"^[a-z0-9_]{1,64}$")]
Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=72)]
Summary = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]


class InvalidMap(Exception):
    pass


class MapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    learner_id: str = Field(min_length=1, max_length=64)
    topic: Slug
    document_id: Slug
    title: Label
    grade: Slug
    section: Slug
    subject: Literal["math", "physics", "svt"]
    reply_language: Literal["fr", "en", "ar"]
    source_revision: int = Field(ge=1)


class Excerpt(BaseModel):
    chunk_id: Slug
    heading: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]
    content: str = Field(min_length=1, max_length=900)
    source: str = Field(min_length=1, max_length=300)
    page: int | None
    language: Literal["fr"]


class Concept(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: Label
    summary: Summary
    source_ids: list[Slug] = Field(min_length=1, max_length=2)


class Branch(Concept):
    group_id: int = Field(strict=True, ge=1, le=5)
    children: list[Concept] = Field(max_length=2)


class Draft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    branches: list[Branch] = Field(min_length=3, max_length=5)


EXCERPTS = TypeAdapter(list[Excerpt])


async def build_mind_map(request, *, rag, client, cache, fair, tier, trace):
    raw = await rag.chapter_excerpts(request.document_id, request.grade, request.section, request.subject)
    if not 3 <= len(raw) <= 8:
        raise NotInCourse
    try:
        excerpts = EXCERPTS.validate_python(raw)
    except ValidationError as exc:
        raise NotInCourse from exc

    headings: dict[str, list[Excerpt]] = {}
    ids = set()
    for chunk in excerpts:
        if (
            chunk.chunk_id in ids or not chunk.chunk_id.startswith(request.document_id + "_chunk_")
            or not chunk.content.strip()
        ):
            raise NotInCourse
        ids.add(chunk.chunk_id)
        headings.setdefault(chunk.heading, []).append(chunk)
    if not 3 <= len(headings) <= 5:
        raise NotInCourse

    evidence = [
        {"group_id": index, "heading": heading, "excerpts": [chunk.model_dump() for chunk in chunks]}
        for index, (heading, chunks) in enumerate(headings.items(), 1)
    ]
    serialized = json.dumps(evidence, ensure_ascii=False, sort_keys=True)
    digest = hashlib.sha256(serialized.encode()).hexdigest()
    trace.rule("tool", tool="chapter_excerpts", ids=sorted(ids))
    key = evidence_key(
        f"mind_map_v1:{request.source_revision}", request.topic, "study", "", request.reply_language,
        request.title, sorted(ids), digest, grade=request.grade, section=request.section, subject=request.subject,
    )
    if (cached := cache.get(key)) is not None:
        trace.cache = "artifact"
        return cached
    if fair and (wait := fair.take(request.learner_id)) > 0:
        raise CapacityUnavailable(wait)

    instructions = (
        f"Create a concise Tunisian baccalaureate mind map for {request.title} in "
        f"{LANG_NAMES[request.reply_language]}. Use only the supplied excerpts as reference material. "
        'Return JSON {"branches":[{"group_id":1,"label":"...","summary":"...","source_ids":["..."],'
        '"children":[{"label":"...","summary":"...","source_ids":["..."]}]}]}. '
        "Return one branch for each supplied group, copying its group_id. Give each branch a distinct plain-text "
        "label of at most 72 characters and a one-sentence summary of at most 240 characters. Use the same "
        "limits for zero to two children about definitions, formulas, conditions or interpretations in that group. "
        "Cite one or two distinct exact chunk IDs from that group for each branch and child. "
        "The cited text must support the complete explanation. Use dollar-delimited LaTeX in summaries."
    )
    result = await client.call(tier, [
        {"role": "system", "content": instructions},
        {"role": "user", "content": serialized},
    ], 2500, json_mode=True)
    trace.llm("mind-map", result)
    try:
        draft = Draft.model_validate_json(result.completion.text)
        artifact = build_artifact(request.title, draft, list(headings.values()), excerpts)
    except (ValidationError, ValueError) as exc:
        raise InvalidMap from exc
    if NO_CACHE_EVENTS.isdisjoint(trace.events):
        cache.put(key, artifact)
    return artifact


def build_artifact(title, draft, groups, excerpts):
    by_group = {branch.group_id: branch for branch in draft.branches}
    if len(by_group) != len(draft.branches) or set(by_group) != set(range(1, len(groups) + 1)):
        raise ValueError("Expected one branch per heading")
    if len({normalize(branch.label) for branch in draft.branches}) != len(by_group):
        raise ValueError("Duplicate branches")

    def node(concept, node_id, allowed, children):
        refs = set(concept.source_ids)
        if len(refs) != len(concept.source_ids) or not refs <= allowed:
            raise ValueError("Invalid citation")
        return {
            "id": node_id, "label": concept.label, "summary": concept.summary,
            "source_ids": concept.source_ids, "children": children,
        }

    branches = []
    for index, group in enumerate(groups, 1):
        branch = by_group[index]
        allowed = {chunk.chunk_id for chunk in group}
        if len({normalize(child.label) for child in branch.children}) != len(branch.children):
            raise ValueError("Duplicate children")
        children = [node(child, f"b{index}-{i}", allowed, []) for i, child in enumerate(branch.children, 1)]
        branches.append(node(branch, f"b{index}", allowed, children))

    return {
        "root": {"id": "root", "label": title, "summary": None, "source_ids": [], "children": branches},
        "sources": [
            {"chunk_id": chunk.chunk_id, "source": chunk.source, "page": chunk.page,
             "language": chunk.language, "excerpt": chunk.content}
            for chunk in excerpts
        ],
    }
