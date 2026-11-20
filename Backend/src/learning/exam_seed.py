"""Frozen original content for migration 9bf225216df8."""

from hashlib import sha256
from unicodedata import normalize

from .exam_seed_practice_v1 import PRACTICE


CURRICULUM = {"grade": "4eme_annee_secondaire", "section": "mathematiques", "subject": "math"}


def fingerprint(prompt: str) -> str:
    canonical = "".join(normalize("NFKC", prompt).casefold().split()).rstrip("?؟.!")
    return sha256(canonical.encode()).hexdigest()


def choice_entries(item_id: str, choices: tuple[str, ...] | list[str]) -> list[dict]:
    return [
        {"id": sha256(f"{item_id}\0{choice}".encode()).hexdigest()[:24], "text": choice}
        for choice in choices
    ]


COMPETITIVE_SLOTS = (
    ("derivative_rules", 1, (
        ("power-a", "Dériver $f(x)=4x^3-3x^2+2$.",
         ("$12x^2-6x$", "$12x^2-3x$", "$4x^2-6x$", "$12x^2-6x+2$"),
         "On dérive terme à terme. $(4x^3)'=12x^2$, $(-3x^2)'=-6x$ et la constante disparaît."),
        ("power-b", "Dériver $g(x)=-2x^4+5x$.",
         ("$-8x^3+5$", "$-2x^3+5$", "$-8x^3+5x$", "$8x^3+5$"),
         "La dérivée de $-2x^4$ vaut $-8x^3$ et celle de $5x$ vaut $5$."),
    )),
    ("differentiability_at_point", 1, (
        ("sides-a", "Pour $f(x)=|x-2|$, quelles sont les dérivées à gauche puis à droite en $2$ ?",
         ("$(-1,1)$", "$(1,-1)$", "$(0,0)$", "$(1,1)$"),
         "À gauche de $2$, $f(x)=2-x$ de pente $-1$. À droite, $f(x)=x-2$ de pente $1$."),
        ("sides-b",
         r"Soit $f(x)=\begin{cases}x^2 & x<0 \\ x^2+x & x\geq 0\end{cases}$. "
         r"Quelles sont les dérivées à gauche puis à droite en $0$ ?",
         ("$(0,1)$", "$(1,0)$", "$(0,0)$", "$(1,1)$"),
         "Comme $f(0)=0$, les taux d’accroissement en $0$ sont $x$ à gauche et $x+1$ à droite. "
         "Leurs limites sont $0$ et $1$."),
    )),
    ("tangent_equation", 2, (
        ("tangent-a", "Quelle est l’équation de la tangente à $f(x)=x^2-x+2$ au point d’abscisse $2$ ?",
         ("$y=3x-2$", "$y=3x+4$", "$y=x+2$", "$y=4x-4$"),
         "On a $f(2)=4$ et $f'(2)=3$. La tangente est $y=4+3(x-2)=3x-2$."),
        ("tangent-b", "Quelle est l’équation de la tangente à $g(x)=x^3-2$ au point d’abscisse $1$ ?",
         ("$y=3x-4$", "$y=3x-1$", "$y=x-2$", "$y=-3x+2$"),
         "On a $g(1)=-1$ et $g'(1)=3$. La tangente est $y=-1+3(x-1)=3x-4$."),
    )),
    ("chain_rule", 2, (
        ("chain-a", "Quelle est la dérivée de $f(x)=(3x^2+1)^4$ ?",
         ("$24x(3x^2+1)^3$", "$4(3x^2+1)^3$", "$12x(3x^2+1)^3$", "$24x(3x^2+1)^4$"),
         "On multiplie la dérivée extérieure $4(3x^2+1)^3$ par la dérivée intérieure $6x$."),
        ("chain-b", r"Quelle est la dérivée de $g(x)=\sqrt{2x^2+1}$ ?",
         (r"$\frac{2x}{\sqrt{2x^2+1}}$", r"$\frac{x}{\sqrt{2x^2+1}}$",
          r"$\frac{1}{2\sqrt{2x^2+1}}$", r"$\frac{4x}{\sqrt{2x^2+1}}$"),
         r"La règle de la chaîne donne $\frac{4x}{2\sqrt{2x^2+1}}$, que l’on simplifie."),
    )),
    ("product_rule", 3, (
        ("product-a", "Soit $f(x)=(x^2+1)(x^3-2)$. Calcule $f'(2)$.",
         "84", "On applique $(uv)'=u'v+uv'$. En $2$, on obtient $4(8-2)+5(3\\cdot 4)=84$."),
        ("product-b", "Soit $g(x)=(x^3+2)(2x^2-3)$. Calcule $g'(-1)$.",
         "-7", "On applique $(uv)'=u'v+uv'$. En $-1$, on obtient $3(-1)+1(-4)=-7$."),
    )),
)


def _base_question(item_id, topic, language, pool, concept, difficulty, prompt, options, explanation):
    choices = [] if isinstance(options, str) else choice_entries(item_id, options)
    return {
        **CURRICULUM,
        "id": item_id, "topic": topic, "language": language,
        "version": 1, "pool": pool, "review_state": "published", "fingerprint": fingerprint(prompt),
        "concept": concept, "difficulty": difficulty, "points": difficulty,
        "kind": "choice" if choices else "number", "prompt": prompt, "choices": choices,
        "answer": {"choice_id": choices[0]["id"]} if choices else {"value": options},
        "explanation": explanation,
        "source": {"chunk_id": item_id, "source": "EdNova", "page": None},
    }


def questions_v1() -> list[dict]:
    competitive = [
        _base_question(f"exam-v1-{slug}", "derivabilite", "fr", "competitive",
                       concept, difficulty, prompt, options, explanation)
        for concept, difficulty, variants in COMPETITIVE_SLOTS
        for slug, prompt, options, explanation in variants
    ]
    practice = [
        _base_question(f"practice-v1-{topic}-{language}-{concept}",
                       topic, language, "practice", concept, 1, prompt, options, explanation)
        for (topic, language), items in PRACTICE.items()
        for concept, prompt, options, explanation in items
    ]
    return competitive + practice


def blueprints_v1() -> list[dict]:
    return [{
        **CURRICULUM,
        "id": "derivabilite-fr-v1",
        "topic": "derivabilite",
        "language": "fr",
        "version": 1,
        "duration_seconds": 180,
        "slots": [
            {
                "concept": concept,
                "difficulty": difficulty,
                "points": difficulty,
                "tiebreak": concept == "product_rule",
                "variants": [f"exam-v1-{slug}" for slug, *_ in variants],
            }
            for concept, difficulty, variants in COMPETITIVE_SLOTS
        ],
    }]
