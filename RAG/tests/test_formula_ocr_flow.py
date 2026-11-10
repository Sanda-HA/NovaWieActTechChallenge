"""Plumbing test of formula_ocr.py with a FAKE pix2tex (the real model is not run in the test suite)."""
import sys
import types

from PIL import Image

import formula_ocr


def install_fake_pix2tex(monkeypatch, answers):
    module = types.ModuleType("pix2tex.cli")
    calls = {"n": 0}

    def latex_ocr():
        def model(image):
            out = answers[calls["n"]]
            calls["n"] += 1
            return out
        return model

    module.LatexOCR = latex_ocr
    monkeypatch.setitem(sys.modules, "pix2tex", types.ModuleType("pix2tex"))
    monkeypatch.setitem(sys.modules, "pix2tex.cli", module)


def test_pix2tex_flow_writes_plain_text_and_latex(tmp_path, monkeypatch):
    install_fake_pix2tex(monkeypatch, [r"\frac{p(A \cap B)}{p(B)}", r"u_n = u_0 \times q^{n}"])
    images = []
    for name in ("a.png", "b.png"):
        path = tmp_path / name
        Image.new("RGB", (40, 20), "white").save(path)
        images.append(str(path))
    out = tmp_path / "out.md"
    monkeypatch.setattr(sys, "argv", ["formula_ocr.py", *images, "--out", str(out)])
    formula_ocr.main()
    text = out.read_text(encoding="utf-8")
    assert "p(A ∩ B) / p(B)" in text and "u_n = u₀ × qⁿ" in text
    assert r"\frac{p(A \cap B)}{p(B)}" in text and "CHECK EACH LINE" in text
