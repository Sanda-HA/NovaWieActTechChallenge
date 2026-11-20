from tests.conftest import register


def test_profile_defaults(client, auth):
    profile = client.get("/me/profile", headers=auth).json()
    assert profile["grade"] == "4eme_annee_secondaire"
    assert profile["section"] == "mathematiques"
    assert profile["subject"] == "math"
    assert profile["reply_language"] == "fr"
    assert profile["preferred_format"] == "examples"


def test_profile_update(client, auth):
    r = client.put("/me/profile", headers=auth, json={"reply_language": "en", "preferred_format": "steps"})
    assert r.status_code == 200
    assert client.get("/me/profile", headers=auth).json()["reply_language"] == "en"
    assert r.json()["section"] == "mathematiques"


def test_profile_rejects_bad_values(client, auth):
    for body in ({"section": "Sciences Exp"}, {"reply_language": "de"}, {"preferred_format": "analogie"}):
        assert client.put("/me/profile", headers=auth, json=body).status_code == 422


def test_profile_accepts_ar(client, auth):
    assert client.put("/me/profile", headers=auth, json={"reply_language": "ar"}).status_code == 200
    assert client.get("/me/profile", headers=auth).json()["reply_language"] == "ar"


def test_profile_requires_auth(client):
    assert client.get("/me/profile").status_code == 401


def test_profiles_are_per_user(client, auth):
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    other = register(client, "eleve02")
    assert client.get("/me/profile", headers=other).json()["reply_language"] == "fr"

def test_onboarding_preferences_survive_profile_reload(client, auth):
    preferences = {"reply_language": "en", "presentation": "visual", "enabled_tools": ["guided"]}
    result = client.put("/me/profile", headers=auth, json=preferences)
    assert result.status_code == 200
    loaded = client.get("/me/profile", headers=auth).json()
    assert {key: loaded.get(key) for key in preferences} == preferences
    assert client.put("/me/profile", headers=auth, json={"enabled_tools": []}).json()["enabled_tools"] == []
    assert client.put("/me/profile", headers=auth, json={"enabled_tools": ["ai-cards"]}).status_code == 422
    assert client.put("/me/profile", headers=auth, json={"presentation": None}).json()["presentation"] is None
