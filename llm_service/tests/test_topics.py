from app.pedagogy.topics import TopicGraph

G = TopicGraph()


def test_every_link_points_to_a_known_topic():
    for slug in G.slugs:
        assert all(G.known(p) for p in G.prerequisites(slug)), slug
        assert all(G.known(n) for n in G.next(slug)), slug


def test_lookup():
    assert G.label("derivabilite") == "Dérivabilité"
    assert G.prerequisites("derivabilite") == ["limites_continuite"]
    assert G.next("inconnu") == [] and not G.known("inconnu")
