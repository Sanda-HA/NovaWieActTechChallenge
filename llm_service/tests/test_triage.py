from app.agent.triage import Action, triage
from app.pedagogy.topics import TopicGraph
from app.providers.platform import Tier
from app.trace import Trace
from tests.fakes import FakeClient

G = TopicGraph()


async def test_triage_parses_compact_json_and_lists_topics_in_prompt():
    client = FakeClient(
        {
            "action": "MULTI_SEARCH",
            "topic": "derivabilite",
            "difficulty": 2,
            "language": "fr",
            "queries": ["continuité", "dérivabilité"],
        }
    )
    t = await triage("Différence entre continue et dérivable ?", "", "bac_math", client, Trace(), G)
    assert t.action is Action.MULTI_SEARCH and len(t.queries) == 2 and t.standalone
    tier, messages = client.calls[0]
    assert tier is Tier.COMPACT and "limites_continuite" in messages[0]["content"]


async def test_unknown_topic_becomes_autre():
    t = await triage("x", "", "b", FakeClient({"action": "SEARCH_COURSE", "topic": "derivee_magique"}), Trace(), G)
    assert t.topic == "autre"


async def test_invalid_json_falls_back_to_course_search():
    trace = Trace()
    t = await triage("dérivée ?", "", "bac_math", FakeClient("not json"), trace, G)
    assert t.action is Action.SEARCH_COURSE and t.queries == ["dérivée ?"]
    assert trace.steps[-1].name == "triage_default"


async def test_rules_override_language_and_confusion():
    client = FakeClient({"action": "SEARCH_COURSE", "language": "fr", "queries": ["dérivée"]})
    t = await triage("ma fhemtch chnowa el dérivée", "", "bac_math", client, Trace(), G)
    assert t.language == "darija" and t.confused
