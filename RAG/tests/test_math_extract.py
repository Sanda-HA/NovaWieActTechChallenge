"""Tests for math_extract.py: the per-page source decision (text / ocr / math) and the LaTeX hint.

The LaTeX produced by the math engine must never reach the indexed chunks: it lives only in
<!-- REVIEW ... --> comments, which the chunker skips.
"""
import pymupdf  # noqa: F401  (kept for symmetry with the other page tests)

from app import chunking
from math_extract import decide, quality


def make_page(text):
    """Stand-in for a pymupdf page object exposing get_text() only."""
    class Stub:
        def get_text(self):
            return text
    return Stub()


def test_quality_flags_garbled_and_clean_pages():
    clean = "Une phrase de texte tout a fait normale, sans signe bizarre." * 4
    assert quality(clean)["garble_ratio"] == 0.0
    garbled = "Formule \x0b\x0c et \x10 et \x7f encore"
    q2 = quality(garbled)
    assert q2["garble_ratio"] > 0.008  # 4 control characters in a short page


def test_garble_ratio_detects_control_characters():
    text = "du texte\x0bpuis un symbole\x0cmanquant et encore\x10un"
    q = quality(text)
    assert q["garble_ratio"] >= 0.001  # far above the clean threshold when text is thin
    assert quality("A\nBBB\n").get("math_glyphs", 0) == 0


def test_math_glyphs_counted():
    q = quality("les sommes a ∑ et ∫ et √ plus ∩")
    assert q["math_glyphs"] >= 3


def test_decide_clean_text_layer():
    clean = "Texte de cours parfaitement lisible de plus de quarante caracteres pour la detection. " * 3
    source, reason = decide(make_page(clean), clean, "none")
    assert source == "text"


def test_decide_text_layer_with_garbled_math_is_risky():
    garbled = ("Definition avec \x0b\x0c et > @ ainsi que des fragments d d  " * 4) + " abcdef"
    q = quality(garbled)
    source, reason = decide(make_page(garbled), garbled, "none")
    assert q["garble_ratio"] > 0.008 and source == "math"
    assert "GARBLE" in reason  # signals: risky even without an engine configured


def test_decide_scanned_page_is_ocr_not_math():
    source, _ = decide(make_page(""), "", "none")
    assert source == "ocr"


def test_latex_hint_never_reaches_chunks():
    """The formula: a math page draft with a LaTeX hint, checked with the real chunker."""
    draft = ("---\ndocument_id: math_4eme_ma_099\ncountry: Tunisia\neducational_level: secondary\n"
             "grade: 4eme_annee_secondaire\nsection: mathematiques\nsubject: Mathematics\ntopic: Test\n"
             "content_type: course\nlanguage: fr\nsource: test\n---\n"
             "<!-- page: 1 -->\n"
             "<!-- REVIEW (math): garbled text layer -->\n"
             "<!-- REVIEW (math-latex hint) USE THIS PLAIN TEXT: p(A ∩ B) / p(B) | LATEX: \\frac{p(A \\cap B)}{p(B)} -->\n"
             "\n"
             "Texte du cours.\n")
    header, body = chunking.parse_header(draft)
    chunks = chunking.chunk_document(draft)
    assert chunks, "the page must produce chunks"
    assert all("LATEX" not in c["content"] and "REVIEW" not in c["content"] for c in chunks)
    assert every_review_line_skipped(body)


def every_review_line_skipped(body):
    """All REVIEW lines (including LaTeX hints) start with the marker the chunker ignores."""
    for line in body.splitlines():
        if "<!--" in line and "REVIEW" not in line and "page:" not in line and "type:" not in line:
            return False
    return True
