import csv
from pathlib import Path


def test_all_corpus_documents_have_manifest_entries():
    root = Path(__file__).resolve().parents[1]
    with (root / "data/source_manifest.csv").open(
        encoding="utf-8", newline=""
    ) as stream:
        ids = {row["document_id"] for row in csv.DictReader(stream)}
    missing = {path.stem for path in (root / "data/documents").glob("*.md")} - ids
    assert missing == set(), f"Missing source-manifest entries: {sorted(missing)}"
