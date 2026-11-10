from app.pedagogy.next_step import recommend
from app.pedagogy.topics import TopicGraph
from app.sessions import Profile, TopicStats

G = TopicGraph()


def test_after_an_explanation_offer_a_guided_exercise():
    step = recommend("derivabilite", "answered", Profile(), G)
    assert step["kind"] == "exercise" and step["request"]["mode"] == "guided"
    assert "Dérivabilité" in step["label"]


def test_repeated_confusion_sends_back_to_the_prerequisite():
    step = recommend("derivabilite", "confused", Profile(), G, asks_this_session=2)
    assert step["kind"] == "prerequisite" and step["topic"] == "limites_continuite"


def test_solved_with_few_hints_moves_to_the_weakest_next_topic():
    p = Profile(topics={"integrales": TopicStats(attempts=3, solved=3), "logarithme": TopicStats(attempts=2)})
    step = recommend("primitives", "solved", p, G, hints_used=1)
    assert step["kind"] == "next_topic" and step["topic"] == "logarithme"


def test_solved_with_many_hints_practises_again_and_unknown_topic_gives_nothing():
    assert recommend("primitives", "solved", Profile(), G, hints_used=3)["kind"] == "exercise"
    assert recommend("autre", "answered", Profile(), G) is None


def test_english_labels():
    assert recommend("derivabilite", "answered", Profile(), G, lang="en")["label"].startswith("Practise")
