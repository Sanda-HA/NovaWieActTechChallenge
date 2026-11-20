import json
from math import hypot, isfinite
from pathlib import Path
import re

import pytest

from src.learning.course_lab import COURSES, course_activity
from src.learning.interactive_lab import lab_activity

CATALOGUE = (
    Path(__file__).resolve().parents[2] / "llm_service/app/pedagogy/data/topics_math_bac.json"
)
PREDICTIONS = {
    "limites_continuite": (-2, -4),
    "suites": (7, 2.06),
    "derivabilite": (-1.5, -3),
    "etude_fonctions": (2, 2),
    "primitives": (3, 2),
    "integrales": (2.5, 6.25),
    "logarithme": (0.25, -1.39),
    "exponentielle": (1, 2.72),
    "equations_differentielles": (2, 2.72),
    "nombres_complexes": (2, 2.83),
    "probabilites": (4, 0.67),
    "statistiques": (11, 8.2),
    "geometrie_espace": (5, 30),
    "isometries_plan": (90, 3),
    "deplacements_antideplacements": (3, 5),
    "similitudes": (1.5, 4.5),
    "coniques": (4, 2.65),
    "divisibilite_z": (19, 4),
    "identite_bezout": (12, 6),
    "loi_binomiale": (2, 0.31),
    "denombrement": (2, 15),
    "probabilites_conditionnelles": (3, 0.33),
    "variables_aleatoires": (0.3, -0.2),
}


def test_all_bac_chapters_and_subtopics_have_activities():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    slugs = {item["slug"] for item in catalogue["topics"] + catalogue["subtopics"]}
    assert slugs == PREDICTIONS.keys()
    assert all(lab_activity(slug, "fr")["topic"] == slug for slug in slugs)
    assert lab_activity("chapitre-inexistant", "fr") is None


@pytest.mark.parametrize("slug", PREDICTIONS)
def test_each_activity_checks_a_bac_prediction(slug):
    value, expected = PREDICTIONS[slug]
    activity = lab_activity(slug, "fr")
    frame = next(frame for frame in activity["frames"] if frame["value"] == value)
    assert frame["answer"] == expected


@pytest.mark.parametrize("slug", PREDICTIONS)
def test_activity_frames_are_plottable_and_independent_of_language(slug):
    french = lab_activity(slug, "fr")
    english = lab_activity(slug, "en")
    assert french == lab_activity(slug, "fr") == lab_activity(slug, "ar")
    json.dumps(french, allow_nan=False)
    for key in ("title", "instruction", "parameter"):
        assert french[key] and english[key] and french[key] != english[key]
    x_min, x_max, y_min, y_max = french["bounds"]
    assert french["bounds"] == english["bounds"]
    assert x_min < x_max and y_min < y_max
    assert 5 <= len(french["frames"]) <= 13
    values = [frame["value"] for frame in french["frames"]]
    assert values == sorted(set(values))
    for fr, en in zip(french["frames"], english["frames"], strict=True):
        assert isfinite(fr["value"]) and isfinite(fr["answer"])
        assert fr["value"] == en["value"] and fr["answer"] == en["answer"]
        assert fr["feedback"] and en["feedback"] and fr["feedback"] != en["feedback"]
        assert fr["series"]
        for series_fr, series_en in zip(fr["series"], en["series"], strict=True):
            assert series_fr["label"] and series_en["label"]
            assert series_fr["style"] == series_en["style"]
            assert series_fr["paths"] == series_en["paths"]
            style = series_fr["style"]
            assert style in {"line", "dashed", "points", "bars", "area"}
            assert series_fr["paths"]
            for path in series_fr["paths"]:
                minimum_points = {"points": 1, "area": 3}.get(style, 2)
                assert len(path) >= minimum_points
                assert all(x_min <= x <= x_max and y_min <= y <= y_max for x, y in path)


def test_every_derivative_frame_plots_the_correct_point_and_slope():
    activity = lab_activity("derivabilite", "en")
    assert activity["equal_axes"] is True
    assert [frame["value"] for frame in activity["frames"]] == [
        -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2,
    ]
    for frame in activity["frames"]:
        a = frame["value"]
        tangent = next(series for series in frame["series"] if series["style"] == "dashed")
        marker = next(series for series in frame["series"] if series["style"] == "points")
        assert marker["paths"] == [[[a, a * a]]]
        (x1, y1), (x2, y2) = tangent["paths"][0]
        assert (y2 - y1) / (x2 - x1) == pytest.approx(frame["answer"])
        assert y1 + frame["answer"] * (a - x1) == pytest.approx(a * a)


def test_rotation_preserves_plotted_side_length():
    for frame in lab_activity("isometries_plan", "en")["frames"]:
        image = next(series for series in frame["series"] if series["style"] == "line")
        (x1, y1), (x2, y2), *_ = image["paths"][0]
        assert hypot(x2 - x1, y2 - y1) == pytest.approx(3, abs=0.000002)


def test_a_half_cent_rounds_up_to_the_expected_hundredth():
    activity = lab_activity("similitudes", "fr")
    frame = next(frame for frame in activity["frames"] if frame["value"] == 0.75)
    assert frame["answer"] == 1.13


def test_every_revision_topic_on_the_course_map_has_localized_scenarios():
    source = CATALOGUE.parents[4] / "web/src/screens/carte/queries.ts"
    topics = source.read_text(encoding="utf-8").split("const REVISION_TOPICS", 1)[1].split("= {", 1)[1].split("};", 1)[0]
    rows = re.findall(r"^\s*(\w+):\s*\[([^\n]+)\]", topics, flags=re.MULTILINE)
    catalogue = {
        f"{subject}_{index}": label
        for subject, labels in rows
        for index, label in enumerate(re.findall(r"'([^']+)'", labels))
    }
    assert catalogue.keys() == COURSES.keys()
    assert len(catalogue) == 27
    assert course_activity("chapitre-inexistant", "fr") is None

    for topic, label in catalogue.items():
        french = course_activity(topic, "fr")
        english = course_activity(topic, "en")
        assert french == course_activity(topic, "ar")
        assert french["topic"] == english["topic"] == topic
        assert french["title"] == label
        assert french["instruction"] != english["instruction"]
        assert len(french["cases"]) == len(english["cases"]) == 2
        assert french["cases"][0]["question"] != french["cases"][1]["question"]
        for fr, en in zip(french["cases"], english["cases"], strict=True):
            assert fr["label"] and en["label"]
            assert len(fr["choices"]) == len(en["choices"])
            assert fr["answer_index"] == en["answer_index"]
            assert 0 <= fr["answer_index"] < len(fr["choices"])
