"""Plain pytest functions (no classes). Run from the project root:  pytest -q   (index must be built first)."""
from fastapi.testclient import TestClient

from app import config
from app.chunking import chunk_document
from app.main import app
from app.retrieval import retrieve
from app.store import load_index

INDEX = load_index(config.INDEX_DIR)
CLIENT = TestClient(app)
PROFILE = {"grade": "4eme_annee_secondaire", "section": "sciences_experimentales", "subject": "Mathematics"}


def test_chunk_metadata_matches_plan_schema():
    for c in INDEX["chunks"]:
        for key in ("chunk_id", "document_id", "country", "educational_level", "grade", "section", "subject",
                    "topic", "content_type", "language", "content", "source", "page"):
            assert key in c
        assert c["content_type"] in config.CONTENT_TYPES
        assert isinstance(c["page"], int)


def test_exercise_statement_and_solution_stay_together():
    for c in INDEX["chunks"]:
        if "**Énoncé.**" in c["content"]:
            assert "**Solution.**" in c["content"], c["chunk_id"]


def test_content_type_filter_is_strict():
    for ct in config.CONTENT_TYPES:
        res = retrieve(INDEX, "continuité", content_type=ct, **PROFILE)
        assert res["chunks"], ct
        assert all(c["metadata"]["content_type"] == ct for c in res["chunks"])


def test_never_more_than_four_chunks_and_exclusion_works():
    res = retrieve(INDEX, "fonction continue dérivable", top_k=50, **PROFILE)
    assert len(res["chunks"]) <= config.MAX_CHUNKS_PER_SEARCH
    seen = [c["chunk_id"] for c in res["chunks"]]
    again = retrieve(INDEX, "fonction continue dérivable", exclude_chunk_ids=seen, **PROFILE)
    assert not set(seen) & {c["chunk_id"] for c in again["chunks"]}


def test_grade_filter_excludes_other_levels():
    res = retrieve(INDEX, "continuité", grade="2eme_annee_secondaire", section=PROFILE["section"], subject="Mathematics")
    assert res["chunks"] == [] and res["evidence_hint"] == "insufficient"


def test_cross_language_arabic_question_finds_french_or_arabic_chunk():
    res = retrieve(INDEX, "ما هو الاحتمال الشرطي؟", **PROFILE)
    assert res["chunks"][0]["document_id"] in ("math_4eme_se_003", "math_4eme_se_007")


def test_derja_is_normalised():
    res = retrieve(INDEX, "kifech nhseb el derivee", **PROFILE)
    assert "comment" in res["diagnostics"]["normalized_question"]
    assert res["chunks"]


def test_unanswerable_is_not_sufficient():
    res = retrieve(INDEX, "Explique la photosynthèse", **PROFILE)
    assert res["evidence_hint"] != "sufficient"


def test_api_contract_and_validation():
    ok = CLIENT.post("/retrieve", json={"question": "Définition du nombre dérivé", "content_type": "definition",
                                        "top_k": 9, **PROFILE})
    assert ok.status_code == 200
    body = ok.json()
    assert len(body["chunks"]) <= 4 and body["evidence_hint"] in ("sufficient", "partial", "insufficient")
    assert {"chunk_id", "content", "score", "metadata"} <= set(body["chunks"][0])
    assert CLIENT.post("/retrieve", json={"question": ""}).status_code == 422
    assert CLIENT.post("/retrieve", json={"question": "x", "content_type": "video"}).status_code == 422


def test_cache_hits_on_repeated_question():
    payload = {"question": "Quand deux événements sont-ils indépendants ?", **PROFILE}
    CLIENT.post("/retrieve", json=payload)
    assert CLIENT.post("/retrieve", json=payload).json()["cached"] is True
