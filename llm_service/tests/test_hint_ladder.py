import json

import pytest

from app.pedagogy.hint_ladder import SAFE_RUNGS, compile_ladder, grade_attempt, parse_ladder
from app.providers.platform import Tier
from app.sessions import Ladder
from app.trace import Trace
from tests.fakes import FakeClient

LADDER = {
    "final_answer": "f'(1) = 6",
    "rungs": [
        "Que vaut le taux de variation ?",
        "Rappelle la définition.",
        "On trouve f'(1) = 6 directement",
        "Solution: ... f'(1) = 6",
    ],
}


def test_leaking_rung_is_replaced_and_last_rung_kept():
    ladder = parse_ladder(json.dumps(LADDER), "derivabilite")
    assert ladder.rungs[2] == SAFE_RUNGS[2] and ladder.topic == "derivabilite"
    assert "f'(1) = 6" in ladder.rungs[3]


def test_incomplete_ladder_is_rejected():
    assert parse_ladder(json.dumps({"final_answer": "x", "rungs": ["a", "b"]})) is None
    assert parse_ladder("not json") is None


@pytest.mark.parametrize(
    "text,final,expected",
    [
        ("Donc f'(1) = 6, bravo", "f'(1) = 6", True),
        ("donc 6, ok", "6", True),
        ("x = -2.", "-2", True),
        ("2", "-2", False),
        ("-2", "2", False),
        ("420", "42", False),
        ("6,5", "6", False),
        ("6.5", "6", False),
        ("1,6", "6", False),
        ("- 2", "2", False),
        ("1/2", "2", False),
        ("2/3", "2", False),
        ("2 + 1", "2", False),
        ("1 / 2", "2", False),
        ("2 + 1", "1", False),
        ("2 * 3", "3", False),
        ("2 × 3", "2", False),
        ("- ( 2 )", "2", False),
    ],
)
async def test_answer_boundaries(text, final, expected):
    client = FakeClient({"correct": False})
    correct, _ = await grade_attempt(text, Ladder(final, ["a"] * 4), client, Trace())
    assert correct is expected


def test_parenthesized_final_answer_is_removed_from_a_hint():
    ladder = parse_ladder(json.dumps({"final_answer": "2", "rungs": ["The answer is (2).", "b", "c", "solution"]}))
    assert ladder.rungs[0] == SAFE_RUNGS[0]


@pytest.mark.parametrize(
    "final,rungs",
    [
        ("6", "abcd"),
        ("6", ["a"] * 5),
        ("6", ["a", "", "c", "d"]),
        (6, ["a"] * 4),
        (" ", ["a"] * 4),
    ],
)
def test_parse_ladder_rejects_invalid_shapes(final, rungs):
    assert parse_ladder(json.dumps({"final_answer": final, "rungs": rungs})) is None


async def test_grade_rejects_string_boolean():
    client = FakeClient({"correct": "false"})
    correct, _ = await grade_attempt("wrong", Ladder("42", ["a"] * 4), client, Trace())
    assert not correct


async def test_compile_uses_one_call():
    client = FakeClient(LADDER)
    ladder = await compile_ladder(
        "Calcule f'(1)",
        [],
        Tier.MID,
        topic="derivabilite",
        level="b",
        reply_language="fr",
        style="examples",
        client=client,
        trace=Trace(),
    )
    assert len(client.calls) == 1 and ladder.final_answer == "f'(1) = 6"


async def test_exact_attempt_is_graded_without_a_call():
    client = FakeClient()
    ok, _ = await grade_attempt("je trouve f'(1) = 6", Ladder("f'(1) = 6", ["a"] * 4), client, Trace())
    assert ok and client.calls == []


async def test_other_attempts_are_graded_by_compact():
    client = FakeClient({"correct": False, "feedback": "Presque, revois le signe."})
    ok, feedback = await grade_attempt("f'(1) = -6", Ladder("f'(1) = 6", ["a"] * 4), client, Trace())
    assert not ok and "signe" in feedback and client.calls[0][0] is Tier.COMPACT
