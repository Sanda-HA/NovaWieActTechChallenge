from pathlib import Path

from app.agent.tools import FakeRag, SearchRequest
from app.pedagogy.peer_check import check_peer_explanation
from app.trace import Trace
from tests.fakes import FakeClient

RAG = FakeRag(Path(__file__).parent / "fixtures" / "chunks.json")


def req(text):
    return SearchRequest(text, "4eme", "sc_exp", "math", "fr", 4)


async def test_wrong_peer_explanation_gets_a_guiding_question_and_real_source():
    text = "Toute fonction continue est dérivable, la limite suffit"
    client = FakeClient(
        {
            "verdict": "incorrect",
            "issue": "continue n'implique pas dérivable",
            "chunk_id": "math_4sc_continuite_001",
            "guiding_question": "Et la fonction |x-1| en 1 ?",
        }
    )
    r = await check_peer_explanation(text, req(text), RAG, client, Trace())
    assert r["verdict"] == "incorrect" and r["source"]["chunk_id"] == "math_4sc_continuite_001"
    assert "|x-1|" in r["guiding_question"]


async def test_a_cited_id_copied_with_its_brackets_still_resolves():
    text = "Toute fonction continue est dérivable"
    client = FakeClient({"verdict": "incorrect", "issue": "faux", "chunk_id": " [math_4sc_continuite_001] ",
                         "guiding_question": "Et |x| en 0 ?"})
    r = await check_peer_explanation(text, req(text), RAG, client, Trace())
    assert r["verdict"] == "incorrect" and r["source"]["chunk_id"] == "math_4sc_continuite_001"


async def test_invented_source_is_dropped():
    text = "Une fonction dérivable est continue"
    client = FakeClient(
        {"verdict": "correct", "issue": "", "chunk_id": "fake_9", "guiding_question": "Et la réciproque ?"}
    )
    r = await check_peer_explanation(text, req(text), RAG, client, Trace())
    assert r["verdict"] == "unknown" and r["source"] is None and r["issue"] == ""
    assert r["guiding_question"] == "Et la réciproque ?"


async def test_incorrect_verdict_without_citation_is_unknown():
    text = "Toute fonction continue est dérivable"
    client = FakeClient({"verdict": "incorrect", "issue": "faux", "guiding_question": "Et |x| en 0 ?"})
    r = await check_peer_explanation(text, req(text), RAG, client, Trace())
    assert r["verdict"] == "unknown" and r["source"] is None and r["issue"] == ""


async def test_topic_outside_the_course_makes_no_llm_call():
    client = FakeClient()
    r = await check_peer_explanation(
        "La photosynthèse produit du glucose", req("photosynthèse glucose"), RAG, client, Trace()
    )
    assert r["verdict"] == "unknown" and client.calls == []


async def test_peer_check_arabic_prompt_names_arabic():
    text = "Toute fonction continue est dérivable, la limite suffit"
    client = FakeClient(
        {
            "verdict": "incorrect",
            "issue": "x",
            "chunk_id": "math_4sc_continuite_001",
            "guiding_question": "؟",
        }
    )
    await check_peer_explanation(text, req(text), RAG, client, Trace(), "ar")
    assert "arabe" in client.calls[0][1][0]["content"]


def peer_client(**extra):
    return FakeClient(
        {
            "verdict": "incomplete",
            "issue": "il manque la réciproque",
            "chunk_id": "math_4sc_continuite_001",
            "guiding_question": "Et la réciproque ?",
            **extra,
        }
    )


async def check(client):
    text = "Une fonction dérivable est continue"
    return await check_peer_explanation(text, req(text), RAG, client, Trace())


async def test_missing_points_are_capped_cleaned_and_truncated():
    client = peer_client(
        missing_points=["a", "", 3, "b" * 300, "c", "d"], restate_prompt="Réexplique en couvrant ces points."
    )
    r = await check(client)
    assert r["missing_points"] == ["a", "b" * 200, "c"]
    assert r["restate_prompt"] == "Réexplique en couvrant ces points."


async def test_non_list_missing_points_become_empty():
    r = await check(peer_client(missing_points="oups"))
    assert r["missing_points"] == []


async def test_unknown_verdict_has_no_missing_points_or_restate_prompt():
    r = await check(peer_client(chunk_id="fake_9", missing_points=["a"], restate_prompt="x"))
    assert r["verdict"] == "unknown" and r["missing_points"] == [] and r["restate_prompt"] == ""


async def test_correct_verdict_has_no_missing_points():
    r = await check(peer_client(verdict="correct", missing_points=["a"], restate_prompt="x"))
    assert r["missing_points"] == []


async def test_out_of_course_result_has_both_keys():
    r = await check_peer_explanation("La photosynthèse", req("photosynthèse glucose"), RAG, FakeClient(), Trace())
    assert r["missing_points"] == [] and r["restate_prompt"] == ""
