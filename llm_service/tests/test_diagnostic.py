from app.pedagogy.diagnostic import items, score
from app.sessions import Profile


def test_items_hide_answers():
    assert all("answer" not in q for q in items()["level_check"])


def test_probe_choice_outweighs_stated_preference():
    p = score(
        {"p1": "step_by_step", "p2": "visual", "s1": "examples",
         "l1": "L’expliquer sans notes", "l2": "Prévoir plusieurs rappels", "l3": "Effacer la réponse"},
        Profile(),
    )
    assert p.style == "examples" and p.level_estimate == "moyen"
