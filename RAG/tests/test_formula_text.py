"""LaTeX -> plain text conversion used for formula OCR output (no pix2tex needed)."""
from formula_ocr import latex_to_text


def test_fraction_and_intersection():
    assert latex_to_text(r"\frac{p(A \cap B)}{p(B)}") == "p(A ∩ B) / p(B)"


def test_sub_and_superscripts():
    assert latex_to_text(r"u_n = u_0 \times q^{n}") == "u_n = u₀ × qⁿ"


def test_binomial_and_exponent_groups():
    assert latex_to_text(r"\binom{n}{k} p^{k}(1-p)^{n-k}") == "C(n, k) p^k(1-p)^(n-k)"


def test_prime_does_not_break_a_fraction():
    assert latex_to_text(r"\frac{u^\prime v-uv^\prime}{v^2}") == "(u' v-uv') / v²"


def test_limit_sqrt_and_sets():
    assert latex_to_text(r"\lim_{x \to a} f(x) = f(a)") == "lim_(x → a) f(x) = f(a)"
    assert latex_to_text(r"\sqrt{x^2+1} \geq 1 \text{ pour } x \in \mathbb{R}") == "√(x²+1) ≥ 1 pour x ∈ ℝ"


def test_unknown_commands_are_kept_not_dropped():
    assert "\\unknowncmd" in latex_to_text(r"\unknowncmd{x}")
