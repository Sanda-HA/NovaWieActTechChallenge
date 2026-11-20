import json

from app.sessions import Ladder, LearnerStore, Profile, TopicStats


def test_profile_switches_style_after_confusion():
    p = Profile()
    p.reward("examples")
    assert p.style == "examples"
    p.penalize("examples")
    p.penalize("examples")
    assert p.style != "examples"


def test_mastery_ignores_hints():
    assert TopicStats().mastery is None
    assert TopicStats(attempts=2, solved=2, hints_used=0).mastery == 1.0
    assert TopicStats(attempts=2, solved=2, hints_used=6).mastery == 1.0
    assert TopicStats(attempts=2, solved=0, confusions=2).mastery == 0.0


def test_ladder_counts_hints_used():
    ladder = Ladder("x", ["a", "b", "c", "d"])
    assert [ladder.take() for _ in range(5)] == [(0, "a"), (1, "b"), (2, "c"), (3, "d"), (3, "d")]
    assert ladder.done and ladder.hints_used == 3


def test_learner_profile_persists(tmp_path):
    path = str(tmp_path / "l.sqlite3")
    store = LearnerStore(path)
    p = store.get("pseudo-42")
    p.reward("visual", 3)
    p.topic("derivabilite").attempts += 1
    store.save("pseudo-42")
    again = LearnerStore(path).get("pseudo-42")
    assert again.style == "visual" and again.topics["derivabilite"].attempts == 1


def test_mistakes_are_capped_at_the_twenty_newest():
    p = Profile()
    for i in range(25):
        p.record_mistake("derivabilite", None, "concept", ts=float(i))
    assert len(p.mistakes) == 20
    assert [m["ts"] for m in p.mistakes] == [float(i) for i in range(5, 25)]


def test_mistakes_round_trip_and_old_profiles_still_load():
    p = Profile()
    p.record_mistake("derivabilite", "taux", "notation", ts=1.0)
    assert Profile.from_json(p.to_json()).mistakes == p.mistakes
    legacy = json.loads(Profile().to_json())
    del legacy["mistakes"]
    assert Profile.from_json(json.dumps(legacy)).mistakes == []
