"""Checks for the English textbook batch (Skills for Life)."""
import re
from pathlib import Path

from convert_scolaire import BOOKS, ENG_CHAPTERS, ENG_LESSONS, ENG_TYPE_SWITCHES

ROOT = Path(__file__).resolve().parents[1]


def test_english_chapters_and_lessons_stay_inside_the_book():
    assert BOOKS["ENG"].exists()
    ids = [chapter[0] for chapter in ENG_CHAPTERS]
    assert len(ids) == len(set(ids))
    for doc_id, topic, first, last in ENG_CHAPTERS:
        assert topic.strip()
        assert 1 <= first <= last
        for page, title in ENG_LESSONS[doc_id]:
            assert first <= page <= last
            assert title.strip()
        for page, content_type in ENG_TYPE_SWITCHES.get(doc_id, {}).items():
            assert first <= page <= last
            assert content_type in {"course", "exercise", "definition"}


def test_reviewed_english_documents_have_the_expected_header():
    for doc_id, _topic, _first, _last in ENG_CHAPTERS:
        path = ROOT / "data" / "documents" / (doc_id + ".md")
        text = path.read_text(encoding="utf-8")
        assert "document_id: " + doc_id in text
        assert "subject: English" in text
        assert "language: en" in text
        assert "<!-- REVIEW" not in text
        assert "<!-- page: " in text
        assert not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", text)
