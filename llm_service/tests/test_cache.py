from app.cache.store import PROMPT_VERSION, CacheStore, evidence_key, exact_key, normalize


def test_normalize_ignores_case_spacing_and_edge_punctuation():
    assert normalize("  C'est quoi une  DÉRIVÉE ? ") == "c'est quoi une dérivée"
    assert normalize("شنوة الدالة؟") == "شنوة الدالة"


def test_normalize_preserves_math_signs_and_delimiters():
    assert normalize("-2") == "-2"
    assert normalize("]0,1[") != normalize("[0,1]")


def test_exact_key_depends_on_mode_level_language_and_style():
    a = exact_key("Dérivée ?", "explain", "bac_math", "fr", "examples")
    assert a == exact_key("dérivée", "explain", "bac_math", "fr", "examples")
    assert a != exact_key("dérivée", "guided", "bac_math", "fr", "examples")
    assert a != exact_key("dérivée", "explain", "bac_math", "en", "examples")
    assert a != exact_key("dérivée", "explain", "bac_math", "fr", "step_by_step")


def test_prompt_version_changes_every_key(monkeypatch):
    before = exact_key("dérivée", "explain", "b", "fr", "s")
    monkeypatch.setattr("app.cache.store.PROMPT_VERSION", PROMPT_VERSION + "-next")
    assert exact_key("dérivée", "explain", "b", "fr", "s") != before


def test_old_cache_version_is_retired(monkeypatch):
    cache = CacheStore(":memory:")
    try:
        args = ("dérivée", "explain", "bac_math", "fr", "examples")
        with monkeypatch.context() as old:
            old.setattr("app.cache.store.PROMPT_VERSION", "v1")
            cache.put(exact_key(*args), {"answer": "Ancienne réponse."})
        assert cache.get(exact_key(*args)) is None
    finally:
        cache.db.close()


def test_evidence_key_ignores_chunk_order():
    k1 = evidence_key("SEARCH_COURSE", "derivabilite", "explain", "bac_math", "fr", "s", ["c2", "c1"], "dérivée")
    k2 = evidence_key("SEARCH_COURSE", "derivabilite", "explain", "bac_math", "fr", "s", ["c1", "c2"], "Dérivée ?")
    assert k1 == k2


def test_store_roundtrip_persistence_and_delete(tmp_path):
    path = str(tmp_path / "c.sqlite3")
    CacheStore(path).put("k", {"answer": "é"})
    assert CacheStore(path).get("k") == {"answer": "é"}
    assert CacheStore(path).get("missing") is None
    assert CacheStore(path).delete(["k", "missing"]) == 1
    assert CacheStore(path).get("k") is None


def test_ladder_key_is_per_exercise_statement():
    from app.cache.store import ladder_key

    assert ladder_key("|x-1| en 1 ?", "b", "fr", "s") == ladder_key("|X-1| en 1", "b", "fr", "s")
    assert ladder_key("|x-1| en 1", "b", "fr", "s") != ladder_key("|x+2| en -2", "b", "fr", "s")
