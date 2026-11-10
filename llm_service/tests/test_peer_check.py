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


async def test_invented_source_is_dropped():
    text = "Une fonction dérivable est continue"
    client = FakeClient(
        {"verdict": "correct", "issue": "", "chunk_id": "fake_9", "guiding_question": "Et la réciproque ?"}
    )
    r = await check_peer_explanation(text, req(text), RAG, client, Trace())
    assert r["verdict"] == "correct" and r["source"] is None


async def test_topic_outside_the_course_makes_no_llm_call():
    client = FakeClient()
    r = await check_peer_explanation(
        "La photosynthèse produit du glucose", req("photosynthèse glucose"), RAG, client, Trace()
    )
    assert r["verdict"] == "unknown" and client.calls == []
