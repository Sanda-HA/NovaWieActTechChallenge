import pytest

from app.agent.orchestrator import ChatRequest
from tests.test_orchestrator import LADDER, TRIAGE_EXO


@pytest.mark.parametrize(
    "grade,expected",
    [
        ({"correct": True, "feedback": "Bien"}, "correct"),
        ({"correct": False, "feedback": "Réessaie"}, "incorrect"),
        ("not json", "unknown"),
        ({"correct": "false"}, "unknown"),
        ("[]", "unknown"),
    ],
)
async def test_attempt_result_is_explicit_and_never_defaults_to_correct(make, grade, expected):
    orch, client = make(TRIAGE_EXO, LADDER, grade)
    first = await orch.handle(ChatRequest(session_id="s", message="Exercice dérivabilité", mode="guided"))
    assert first.get("attempt_result") is None
    result = await orch.handle(
        ChatRequest(session_id="s", message="une tentative distincte", mode="guided", action="attempt")
    )
    assert result["attempt_result"]["verdict"] == expected
    assert set(result["attempt_result"]) >= {"verdict", "issue", "guiding_question", "source"}
    if expected == "unknown":
        assert result["hint_rung"] == first["hint_rung"]
        assert orch.sessions.get("s").ladder is not None
        assert orch.learners.get("s").topic("derivabilite").solved == 0


async def test_hint_result_has_no_attempt_verdict(make):
    orch, _ = make(TRIAGE_EXO, LADDER)
    await orch.handle(ChatRequest(session_id="s", message="Exercice dérivabilité", mode="guided"))
    hint = await orch.handle(ChatRequest(session_id="s", message="un indice", mode="guided", action="hint"))
    assert hint.get("attempt_result") is None


async def test_incorrect_attempt_records_a_mistake_and_reports_its_type(make):
    grade = {"correct": False, "feedback": "Réessaie", "mistake_type": "calculation"}
    orch, _ = make(TRIAGE_EXO, LADDER, grade)
    await orch.handle(ChatRequest(session_id="s", message="Exercice dérivabilité", mode="guided"))
    result = await orch.handle(
        ChatRequest(session_id="s", message="une tentative distincte", mode="guided", action="attempt")
    )
    assert result["attempt_result"]["mistake_type"] == "calculation"
    mistakes = orch.learners.get("s").mistakes
    assert [(m["topic"], m["type"]) for m in mistakes] == [("derivabilite", "calculation")]
    assert set(mistakes[0]) == {"topic", "subtopic", "type", "ts"}


async def test_unlabelled_incorrect_attempt_records_nothing(make):
    orch, _ = make(TRIAGE_EXO, LADDER, {"correct": False, "feedback": "Réessaie"})
    await orch.handle(ChatRequest(session_id="s", message="Exercice dérivabilité", mode="guided"))
    result = await orch.handle(
        ChatRequest(session_id="s", message="une tentative distincte", mode="guided", action="attempt")
    )
    assert result["attempt_result"]["mistake_type"] is None
    assert orch.learners.get("s").mistakes == []
