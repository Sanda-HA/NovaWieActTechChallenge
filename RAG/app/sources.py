"""Permission manifest shared by ingestion and exact chapter lookup."""

import csv


def read_manifest(path):
    with open(path, encoding="utf-8", newline="") as file:
        return {row["document_id"]: row for row in csv.DictReader(file)}


def read_approved_sources(path):
    if not path.exists():
        return set()
    with open(path, encoding="utf-8", newline="") as f:
        return {
            row["document_id"].strip()
            for row in csv.DictReader(f)
            if row.get("approved", "").strip().lower() == "yes"
        }


def chapter_excerpts(index, document_id, grade, section, subject):
    scope = (grade, section, subject.casefold())
    chunks = [
        chunk for chunk in index["chunks"]
        if chunk["document_id"] == document_id
        and (chunk["grade"], chunk["section"], chunk["subject"].casefold()) == scope
        and chunk["language"] == "fr"
        and chunk["content_type"] in {"course", "definition"}
    ]
    if (
        not 3 <= len(chunks) <= 8
        or not 3 <= len({chunk["heading"].strip() for chunk in chunks}) <= 5
        or any(not chunk["heading"].strip() or not 1 <= len(chunk["content"].strip()) <= 900 for chunk in chunks)
    ):
        return []
    fields = ("chunk_id", "heading", "source", "page", "language", "content")
    return [{field: chunk[field] for field in fields} for chunk in chunks]
