import pytest

from app.safety.privacy import is_distress, redact, wellbeing_message


def test_name_redaction_accepts_typographic_apostrophe():
    for apostrophe in "’‘ʼ":
        assert redact(f"Je m{apostrophe}appelle Alice")[0] == "Je m'appelle [prénom]"


def test_name_redaction_preserves_lowercase_word():
    assert redact("Je m'appelle Alice je veux mourir")[0] == "Je m'appelle [prénom] je veux mourir"


def test_redacts_email_phone_and_self_introduced_name():
    text, found = redact("Je m'appelle Amira, mon num 22 345 678, mail amira.b@gmail.com. C'est quoi ln ?")
    assert "Amira" not in text and "22 345 678" not in text and "gmail" not in text
    assert set(found) == {"email", "phone", "name"}
    assert "C'est quoi ln ?" in text


def test_keeps_maths_numbers():
    text, found = redact("Calcule f(2) = 3x + 12 pour x = 1000")
    assert found == [] and text == "Calcule f(2) = 3x + 12 pour x = 1000"


@pytest.mark.parametrize("msg", ["je veux mourir", "nheb nmout", "I want to die", "نحب نموت"])
def test_distress_detected_in_four_languages(msg):
    assert is_distress(msg)


@pytest.mark.parametrize("apostrophe", ["’", "‘", "ʼ"])
def test_distress_accepts_typographic_apostrophes(apostrophe):
    assert is_distress(f"je n{apostrophe}en peux plus de vivre")


def test_no_false_alarm_on_maths():
    assert not is_distress("la fonction meurt en zéro ? non, elle tend vers 0")


def test_wellbeing_message_adds_contact_only_when_configured():
    assert "contacter" not in wellbeing_message("fr", "")
    assert "Ligne X" in wellbeing_message("fr", "Ligne X")
