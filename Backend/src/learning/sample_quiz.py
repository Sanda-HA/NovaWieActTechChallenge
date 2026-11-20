from .schemas import AgentQuestion, AgentQuiz

# Ednova-authored sample. It uses the normal quiz response and grading path.
QUESTIONS = {
    "fr": (
        "Quelle est la dérivée de $f(x) = x^2$ ?",
        "La règle de dérivation des puissances donne $(x^2)' = 2x$.",
    ),
    "en": (
        "What is the derivative of $f(x) = x^2$?",
        "The power rule gives $(x^2)' = 2x$.",
    ),
    "ar": (
        "ما مشتقة الدالة $f(x) = x^2$؟",
        "حسب قاعدة اشتقاق القوى، $(x^2)' = 2x$.",
    ),
}


def sample_quiz(reply_language: str) -> AgentQuiz:
    question, explanation = QUESTIONS.get(reply_language, QUESTIONS["fr"])
    return AgentQuiz(topic="derivabilite", questions=[AgentQuestion(
        id="sample_derivative", question=question, choices=["$x$", "$2x$", "$2$", "$x^2$"],
        answer_index=1, explanation=explanation,
    )])
