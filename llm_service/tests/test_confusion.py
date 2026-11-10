import pytest

from app.pedagogy.confusion import guess_language, is_confused, wants_hint


@pytest.mark.parametrize("msg", ["Je comprends pas", "ma fhemtch chay", "ما فهمتش", "I don't get it!"])
def test_confusion_in_four_languages(msg):
    assert is_confused(msg)


def test_not_confused():
    assert not is_confused("C'est quoi une dérivée ?")


def test_hint_request():
    assert wants_hint("un indice stp")


def test_language_guess():
    assert guess_language("chnowa el dérivée ?") == "darija"
    assert guess_language("ki nheb n7seb limite") == "darija"
    assert guess_language("شنوة الدالة") is None
    assert guess_language("What is a derivative?") is None
