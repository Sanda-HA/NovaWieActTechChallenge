import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = "/chapter-excerpts/"
SCOPE = {"grade": "4eme_annee_secondaire", "section": "sciences_experimentales", "subject": "mathematics"}


@pytest.mark.parametrize(("doc", "subject", "count"), [
    ("math_4eme_se_001", "mathematics", 4),
    ("math_4eme_se_002", "mathematics", 5),
    ("math_4eme_se_003", "mathematics", 5),
    ("math_4eme_se_004", "mathematics", 4),
    ("phys_4eme_se_001", "physics", 3),
    ("svt_4eme_se_101", "svt", 3),
])
def test_chapter_excerpts_are_complete_and_ordered(doc, subject, count):
    response = TestClient(app).get(ROOT + doc, params={**SCOPE, "subject": subject})
    assert response.status_code == 200
    chunks = response.json()["chunks"]
    assert len(chunks) == count
    assert [chunk["chunk_id"] for chunk in chunks] == sorted(chunk["chunk_id"] for chunk in chunks)
    assert all(chunk["language"] == "fr" and chunk["heading"] for chunk in chunks)


def test_chapter_excerpts_exclude_other_sections_drafts_and_exercises():
    client = TestClient(app)
    assert client.get(ROOT + "math_4eme_se_002", params={**SCOPE, "section": "mathematiques"}).status_code == 404
    assert client.get(ROOT + "math_4eme_ma_009", params={**SCOPE, "section": "mathematiques"}).status_code == 404
    assert client.get(ROOT + "math_4eme_se_005", params=SCOPE).status_code == 404
    assert client.get(ROOT + "svt_4eme_se_101", params={**SCOPE, "section": "mathematiques", "subject": "svt"}).status_code == 404


def test_lookup_checks_current_permission_even_when_the_document_is_indexed(monkeypatch):
    from app import main

    document = "math_4eme_se_002"
    assert any(chunk["document_id"] == document for chunk in main.get_index()["chunks"])
    monkeypatch.setattr(main, "read_manifest", lambda _: {document: {"permission_verified": "no"}})
    assert TestClient(app).get(ROOT + document, params=SCOPE).status_code == 404


def test_lookup_requires_current_review_approval(monkeypatch):
    from app import main

    document = "math_4eme_se_002"
    assert any(chunk["document_id"] == document for chunk in main.get_index()["chunks"])
    monkeypatch.setattr(main, "read_approved_sources", lambda _: set())
    assert TestClient(app).get(ROOT + document, params=SCOPE).status_code == 404
