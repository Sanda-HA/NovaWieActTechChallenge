"""Convert images of formulas (cropped screenshots) to LaTeX and to plain Unicode text.

Why crops: pix2tex reads ONE formula image at a time (it is not a page OCR). Screenshot each
formula you need, put the images in a folder, run this script, and paste the result into your document.

Engines
  pix2tex  (default)  open source, runs on YOUR machine, no data leaves it, no extra service to declare.
                      pip install pix2tex   (pulls PyTorch; the model weights download on first run)
  mathpix  (optional) external paid service. Your images are sent to a third party: it counts as an EXTRA
                      SERVICE to declare in the report, and it must not be used on data that is not public.
                      Needs MATHPIX_APP_ID and MATHPIX_APP_KEY in the environment. Not tested in this project.

Usage:
    python formula_ocr.py crops/*.png                    # prints a table, writes formulas_out.md
    python formula_ocr.py crops/*.png --engine mathpix
    python formula_ocr.py --latex "\\frac{p(A \\cap B)}{p(B)}"     # just convert a LaTeX string to plain text

The plain-text form (e.g. p(A ∩ B) / p(B)) is what you should put in the documents: it is readable by
the retriever and the LLM. ALWAYS compare the result with the image: formula OCR makes mistakes.
"""
import argparse
import base64
import json
import os
import re
import sys

GREEK = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "varepsilon": "ε", "theta": "θ",
    "lambda": "λ", "mu": "μ", "pi": "π", "rho": "ρ", "sigma": "σ", "tau": "τ", "phi": "φ", "varphi": "φ",
    "omega": "ω", "Delta": "Δ", "Sigma": "Σ", "Omega": "Ω", "Pi": "Π", "Gamma": "Γ", "Lambda": "Λ", "Phi": "Φ",
}
SYMBOLS = {
    "infty": "∞", "to": "→", "rightarrow": "→", "Rightarrow": "⇒", "Leftrightarrow": "⇔", "leftrightarrow": "↔",
    "leq": "≤", "le": "≤", "geq": "≥", "ge": "≥", "neq": "≠", "ne": "≠", "approx": "≈", "cap": "∩", "cup": "∪",
    "in": "∈", "notin": "∉", "subset": "⊂", "subseteq": "⊆", "times": "×", "cdot": "·", "pm": "±", "mp": "∓",
    "forall": "∀", "exists": "∃", "emptyset": "∅", "varnothing": "∅", "sum": "∑", "prod": "∏", "int": "∫",
    "partial": "∂", "circ": "∘", "ldots": "…", "dots": "…", "cdots": "…", "div": "÷", "equiv": "≡",
    "sin": "sin", "cos": "cos", "tan": "tan", "ln": "ln", "log": "log", "exp": "exp", "lim": "lim", "max": "max",
    "min": "min", "mid": "|", "prime": "'", "vert": "|", "lvert": "|", "rvert": "|",
}
BLACKBOARD = {"R": "ℝ", "N": "ℕ", "Z": "ℤ", "Q": "ℚ", "C": "ℂ"}
SUP = str.maketrans("0123456789+-=()n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ")
SUB = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")


def _script(text, table, marker):
    """x^{12} -> x¹² when every character has a Unicode form, else x^(12)."""
    allowed = "0123456789+-=()n" if table is SUP else "0123456789+-=()"
    if text and all(ch in allowed for ch in text):
        return text.translate(table)
    return marker + ("(%s)" % text if len(text) > 1 else text)


def _top_level_operator(text):
    """True if text has an operator or space outside parentheses (so a fraction part needs brackets)."""
    depth = 0
    for ch in text:
        depth += ch == "("
        depth -= ch == ")"
        if depth == 0 and ch in " +-*=<>×·":
            return True
    return False


def _fraction(num, den):
    num = "(%s)" % num if _top_level_operator(num) else num
    den = "(%s)" % den if _top_level_operator(den) else den
    return "%s / %s" % (num, den)


def latex_to_text(latex):
    """Best-effort LaTeX -> plain Unicode text. Anything unknown is kept readable, never dropped silently."""
    s = latex.strip().strip("$")
    s = re.sub(r"\\(left|right|big|Big|bigg|Bigg)\s*([()\[\]|.]|\\\{|\\\})?", lambda m: (m.group(2) or "").replace("\\", ""), s)
    s = re.sub(r"\^\s*(?:\{\s*\\prime\s*\}|\\prime(?![A-Za-z]))", "'", s)
    s = re.sub(r"\\(quad|qquad)", " ; ", s)
    s = re.sub(r"\\(,|;|:|!)", " ", s)
    s = re.sub(r"\\(mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}", r"\2", s)
    s = re.sub(r"\\(mathbb)\{([A-Z])\}", lambda m: BLACKBOARD.get(m.group(2), m.group(2)), s)
    s = re.sub(r"\\overrightarrow\{([^{}]*)\}", r"vecteur \1", s)
    s = re.sub(r"\\(bar|overline)\{([^{}]*)\}", r"\2̄", s)
    previous = None
    while previous != s:                                    # innermost braces first
        previous = s
        s = re.sub(r"\\binom\{([^{}]*)\}\{([^{}]*)\}", r"C(\1, \2)", s)
        s = re.sub(r"\\d?frac\{([^{}]*)\}\{([^{}]*)\}", lambda m: _fraction(m.group(1), m.group(2)), s)
        s = re.sub(r"\\sqrt\[(\d+)\]\{([^{}]*)\}", r"racine \1-ième(\2)", s)
        s = re.sub(r"\\sqrt\{([^{}]*)\}", r"√(\1)", s)
        s = re.sub(r"\\sqrt\s*(\w)", r"√\1", s)
        s = re.sub(r"\^\{([^{}]*)\}", lambda m: _script(m.group(1), SUP, "^"), s)
        s = re.sub(r"_\{([^{}]*)\}", lambda m: _script(m.group(1), SUB, "_"), s)
    s = re.sub(r"\^(\w)", lambda m: _script(m.group(1), SUP, "^"), s)
    s = re.sub(r"_(\w)", lambda m: _script(m.group(1), SUB, "_"), s)
    s = re.sub(r"\\([A-Za-z]+)", lambda m: GREEK.get(m.group(1)) or SYMBOLS.get(m.group(1)) or m.group(0), s)
    s = s.replace("\\{", "{").replace("\\}", "}").replace("\\\\", " ")
    s = re.sub(r"[{}]", "", s)
    s = re.sub(r"\s*([=≤≥≠≈→⇒⇔∈∩∪])\s*", r" \1 ", s)
    return re.sub(r"\s+", " ", s).strip()


def run_pix2tex(paths):
    try:
        from PIL import Image
        from pix2tex.cli import LatexOCR
    except ImportError:
        sys.exit("pix2tex is not installed. Run: pip install pix2tex   (it installs PyTorch; first run downloads the model)")
    model = LatexOCR()
    return [model(Image.open(p)) for p in paths]


def run_mathpix(paths):
    import requests
    app_id, app_key = os.getenv("MATHPIX_APP_ID"), os.getenv("MATHPIX_APP_KEY")
    if not app_id or not app_key:
        sys.exit("Set MATHPIX_APP_ID and MATHPIX_APP_KEY in the environment (never in the code).")
    out = []
    for p in paths:
        with open(p, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        r = requests.post("https://api.mathpix.com/v3/text", headers={"app_id": app_id, "app_key": app_key},
                          json={"src": "data:image/png;base64," + data, "formats": ["latex_styled"]}, timeout=60)
        if r.status_code != 200:
            sys.exit("Mathpix error HTTP %d" % r.status_code)
        out.append(r.json().get("latex_styled", ""))
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("images", nargs="*")
    p.add_argument("--engine", default="pix2tex", choices=["pix2tex", "mathpix"])
    p.add_argument("--latex", help="convert this LaTeX string to plain text and exit")
    p.add_argument("--out", default="formulas_out.md")
    args = p.parse_args()

    if args.latex:
        print(latex_to_text(args.latex))
        return
    if not args.images:
        p.error("give image files, or use --latex")
    latex = run_pix2tex(args.images) if args.engine == "pix2tex" else run_mathpix(args.images)
    rows = [(path, ltx, latex_to_text(ltx)) for path, ltx in zip(args.images, latex)]
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("# Formula OCR output (engine: %s) - CHECK EACH LINE AGAINST ITS IMAGE\n\n" % args.engine)
        for path, ltx, txt in rows:
            f.write("- `%s`\n  - plain text (use this): `%s`\n  - LaTeX: `%s`\n" % (path, txt, ltx))
            print("%-30s %s" % (os.path.basename(path), txt))
    print("\nWritten to %s. Compare every formula with its image before pasting it into a document." % args.out)


if __name__ == "__main__":
    main()
