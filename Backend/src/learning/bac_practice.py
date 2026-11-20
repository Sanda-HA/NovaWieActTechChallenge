"""Team-authored Bac practice on the derivative, tangents, and continuity."""

from .schemas import AgentQuestion, AgentQuiz

# Formula choices are shared across the three reply languages.
NUMERIC_CHOICES = (
    (["$3$", "$6$", "$9$", "$12$"], 1),
    (["$y=6x+9$", "$y=3x$", "$y=6x-9$", "$y=9x-6$"], 2),
    (["$0$", "$1$", "$2$", "$4$"], 0),
)

COPY = {
    "fr": (
        ("Quelle est la pente de la tangente à $f(x)=x^2$ en $x=3$ ?",
         "Comme $f'(x)=2x$, la pente vaut $f'(3)=6$."),
        ("Quelle est l’équation de cette tangente à $f(x)=x^2$ en $x=3$ ?",
         "La tangente passe par $(3,9)$ avec une pente de $6$, donc $y=6(x-3)+9=6x-9$."),
        ("Quelle est la pente de la tangente à $f(x)=x^2$ en $x=0$ ?",
         "On a $f'(0)=0$, donc la tangente est horizontale."),
        ("Que peut-on conclure si $f$ est dérivable en $a$ ?",
         "La dérivabilité en un point implique la continuité en ce point.",
         ["$f$ est constante.", "$f$ est continue en $a$.", "$f(a)=0$.", "$f'(a)=0$."], 1),
        ("Pourquoi $f(x)=|x|$ n’est-elle pas dérivable en $0$ ?",
         "Les pentes à gauche et à droite valent respectivement $-1$ et $1$.",
         ["Elle est discontinue en $0$.", "Elle n’est pas définie en $0$.",
          "Les deux pentes valent $0$.", "Les pentes à gauche et à droite diffèrent."], 3),
    ),
    "en": (
        ("What is the slope of the tangent to $f(x)=x^2$ at $x=3$?",
         "Since $f'(x)=2x$, the slope is $f'(3)=6$."),
        ("What is the equation of the tangent to $f(x)=x^2$ at $x=3$?",
         "The line passes through $(3,9)$ with slope $6$, so $y=6(x-3)+9=6x-9$."),
        ("What is the slope of the tangent to $f(x)=x^2$ at $x=0$?",
         "Since $f'(0)=0$, the tangent is horizontal."),
        ("What follows if $f$ is differentiable at $a$?",
         "Differentiability at a point implies continuity at that point.",
         ["$f$ is constant.", "$f$ is continuous at $a$.", "$f(a)=0$.", "$f'(a)=0$."], 1),
        ("Why is $f(x)=|x|$ not differentiable at $0$?",
         "Its left and right slopes are $-1$ and $1$ respectively.",
         ["It is discontinuous at $0$.", "It is undefined at $0$.",
          "Both slopes are $0$.", "The left and right slopes differ."], 3),
    ),
    "ar": (
        ("ما ميل المماس لمنحنى $f(x)=x^2$ عند $x=3$؟",
         "بما أن $f'(x)=2x$، فإن الميل يساوي $f'(3)=6$."),
        ("ما معادلة المماس لمنحنى $f(x)=x^2$ عند $x=3$؟",
         "يمر المماس بالنقطة $(3,9)$ وميله $6$، ومن ثم $y=6(x-3)+9=6x-9$."),
        ("ما ميل المماس لمنحنى $f(x)=x^2$ عند $x=0$؟",
         "لدينا $f'(0)=0$، لذا يكون المماس أفقيًا."),
        ("ماذا نستنتج إذا كانت $f$ قابلة للاشتقاق عند $a$؟",
         "قابلية الاشتقاق عند نقطة تستلزم الاستمرارية عندها.",
         ["الدالة $f$ ثابتة.", "الدالة $f$ مستمرة عند $a$.", "$f(a)=0$.", "$f'(a)=0$."], 1),
        ("لماذا لا تقبل $f(x)=|x|$ الاشتقاق عند $0$؟",
         "الميل على اليسار يساوي $-1$ وعلى اليمين يساوي $1$.",
         ["الدالة غير مستمرة عند $0$.", "الدالة غير معرّفة عند $0$.",
          "الميلان يساويان $0$.", "الميلان على اليسار واليمين مختلفان."], 3),
    ),
}


def bac_practice(reply_language: str) -> AgentQuiz:
    rows = COPY.get(reply_language, COPY["fr"])
    questions = []
    for index, (question, explanation, *choices_and_answer) in enumerate(rows):
        choices, answer = choices_and_answer or NUMERIC_CHOICES[index]
        questions.append(AgentQuestion(
            id=f"bac_derivabilite_{index + 1}", question=question, choices=choices,
            answer_index=answer, explanation=explanation,
        ))
    return AgentQuiz(topic="derivabilite", questions=questions)
