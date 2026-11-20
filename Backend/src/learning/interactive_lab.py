"""Authored maths activities evaluated with fixed formulas for each chapter."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from itertools import product
from math import comb, cos, exp, gcd, log, pi, radians, sin, sqrt

Copy = tuple[str, str]
Point = list[float]


@dataclass(frozen=True)
class Series:
    label: Copy
    style: str
    paths: tuple[list[Point], ...]


@dataclass(frozen=True)
class Exercise:
    title: Copy
    instruction: Copy
    parameter: Copy
    bounds: tuple[float, float, float, float]
    values: Sequence[float]
    calculate: Callable[[float], tuple[float, Copy, list[Series]]]
    equal_axes: bool = False


def plot(label: Copy, style: str, *paths: list[Point]) -> Series:
    return Series(label, style, paths)


def curve(function: Callable[[float], float], start: float, stop: float, steps: int = 36) -> list[Point]:
    xs = [start + (stop - start) * i / steps for i in range(steps + 1)]
    return [[x, function(x)] for x in xs]


def marker(x: float, y: float, label: Copy = ("Point choisi", "Selected point")) -> Series:
    return plot(label, "points", [[x, y]])


def limits(x):
    return 2 * x, ("La limite en $1$ vaut $2$.", "The limit at $1$ is $2$."), [
        plot(("Courbe avec un trou en $1$", "Graph with a hole at $1$"), "line",
             [[-3, -6], [.94, 1.88]], [[1.06, 2.12], [3, 6]]),
        marker(x, 2 * x),
    ]


def sequence(n):
    def value(k):
        return 2 + 1 / (2 * k + 3)

    return value(n), ("Les termes se rapprochent de $2$.", "The terms approach $2$."), [
        plot(("Termes de la suite", "Sequence terms"), "points", [[k, value(k)] for k in range(9)]),
        plot(("Limite", "Limit"), "dashed", [[0, 2], [8, 2]]),
        marker(n, value(n)),
    ]


def tangent(a):
    slope = 2 * a
    intercept = -a * a
    if slope:
        ends = sorted([(-1 - intercept) / slope, (5 - intercept) / slope])
        left, right = max(-4, ends[0]), min(4, ends[1])
    else:
        left, right = -4, 4
    points = [[x, max(-1, min(5, slope * x + intercept))] for x in (left, right)]
    return slope, ("Le coefficient directeur vaut $f'(a)=2a$.", "The slope is $f'(a)=2a$."), [
        plot(("$y=x^2$", "$y=x^2$"), "line", curve(lambda x: x * x, -2.2, 2.2)),
        plot(("Tangente", "Tangent"), "dashed", points),
        marker(a, a * a),
    ]


def minimum(a):
    return a, ("Le minimum est au sommet de la parabole.", "The minimum is at the vertex of the parabola."), [
        plot(("Parabole", "Parabola"), "line", curve(lambda x: (x - a) ** 2 - 1, a - 2.5, a + 2.5)),
        plot(("Axe de symétrie", "Axis of symmetry"), "dashed", [[a, -2], [a, 6]]),
    ]


def primitive(c):
    return c - 1, ("Toutes ces primitives ont pour dérivée $-2x$.", "Each antiderivative has derivative $-2x$."), [
        plot(("Primitive de référence", "Reference antiderivative"), "dashed", curve(lambda x: -x * x, -2.5, 2.5)),
        plot(("Primitive choisie", "Selected antiderivative"), "line", curve(lambda x: c - x * x, -2.5, 2.5)),
        marker(1, c - 1),
    ]


def integral(a):
    return a * a, ("L’aire du triangle vaut $a^2$.", "The area of the triangle is $a^2$."), [
        plot(("Aire entre $0$ et $a$", "Area from $0$ to $a$"), "area", [[0, 0], [a, 0], [a, 2 * a]]),
        plot(("$y=2x$", "$y=2x$"), "line", [[0, 0], [4, 8]]),
    ]


def logarithm(a):
    return log(a), ("La courbe passe par $(1,0)$.", "The curve passes through $(1,0)$."), [
        plot(("$y=\\ln(x)$", "$y=\\ln(x)$"), "line", curve(log, .15, 6)),
        marker(a, log(a)),
    ]


def exponential(a):
    return exp(a), ("L’exponentielle est croissante et toujours positive.",
                    "The exponential is increasing and always positive."), [
        plot(("$y=e^x$", "$y=e^x$"), "line", curve(exp, -2, 2)),
        marker(a, exp(a)),
    ]


def differential(a):
    def solution(t):
        return exp(a * t)

    return solution(.5), ("La solution de $y'=ay$ avec $y(0)=1$ est $y=e^{at}$.",
                          "The solution of $y'=ay$ with $y(0)=1$ is $y=e^{at}$."), [
        plot(("Solution", "Solution"), "line", curve(solution, 0, 1)),
        marker(.5, solution(.5)),
    ]


def complex_modulus(b):
    return sqrt(4 + b * b), ("Le module est la distance à l’origine.", "The modulus is the distance to the origin."), [
        plot(("Vecteur", "Vector"), "line", [[0, 0], [2, b]]),
        plot(("Composantes", "Components"), "dashed", [[0, 0], [2, 0], [2, b]]),
        marker(2, b, ("Affixe", "Complex point")),
    ]


def probability(red):
    return red / (red + 2), ("On divise le nombre de boules rouges par le total.",
                             "Divide the red ball count by the total."), [
        plot(("Rouges", "Red"), "bars", [[1, red], [2, 0]]),
        plot(("Bleues", "Blue"), "bars", [[1, 0], [2, 2]]),
    ]


def statistics(a):
    mean = (4 + 7 + 9 + 10 + a) / 5
    return mean, ("La moyenne est la somme des cinq valeurs divisée par cinq.",
                  "The mean is the sum of the five values divided by five."), [
        plot(("Valeurs", "Values"), "bars", [[1, 4], [2, 7], [3, 9], [4, 10], [5, a]]),
        plot(("Moyenne", "Mean"), "dashed", [[.5, mean], [5.5, mean]]),
    ]


def volume(a):
    vertices = list(product((0, a), (0, 3), (0, 2)))

    def project(p):
        x, y, z = p
        return [x - .65 * y, z + .4 * y]

    edges = [
        [project(start), project(end)] for i, start in enumerate(vertices) for end in vertices[i + 1:]
        if sum(x != y for x, y in zip(start, end, strict=True)) == 1
    ]
    return 6 * a, ("Le volume vaut longueur × largeur × hauteur.", "Volume equals length × width × height."), [
        plot(("Arêtes du pavé", "Cuboid edges"), "line", *edges),
    ]


TRIANGLE = [[0, 0], [3, 0], [0, 2], [0, 0]]


def rotation(angle):
    turn = radians(angle)
    image = [[x * cos(turn) - y * sin(turn), x * sin(turn) + y * cos(turn)] for x, y in TRIANGLE]
    return 3, ("Une rotation conserve les longueurs.", "A rotation preserves lengths."), [
        plot(("Triangle de départ", "Original triangle"), "dashed", TRIANGLE),
        plot(("Triangle tourné", "Rotated triangle"), "line", image),
    ]


def reflection(a):
    return 2 * a - 1, ("L’axe est au milieu du segment qui relie les deux points.",
                       "The axis bisects the segment joining the two points."), [
        plot(("Axe de symétrie", "Mirror axis"), "dashed", [[a, -2], [a, 3]]),
        marker(1, 1, ("Point de départ", "Original point")),
        marker(2 * a - 1, 1, ("Image", "Reflection")),
    ]


def similarity(k):
    return 2 * k * k, ("L’aire est multipliée par le carré du rapport.",
                       "Area is multiplied by the square of the scale factor."), [
        plot(("Triangle de départ", "Original triangle"), "dashed", [[0, 0], [2, 0], [0, 2], [0, 0]]),
        plot(("Triangle agrandi ou réduit", "Scaled triangle"), "line", [[0, 0], [2 * k, 0], [0, 2 * k], [0, 0]]),
    ]


def ellipse(a):
    c = sqrt(a * a - 9)
    points = [[a * cos(i * pi / 24), 3 * sin(i * pi / 24)] for i in range(49)]
    return c, ("La distance focale vérifie $c^2=a^2-b^2$ avec $b=3$.",
               "The focal distance satisfies $c^2=a^2-b^2$ with $b=3$."), [
        plot(("Ellipse", "Ellipse"), "line", points),
        plot(("Foyers", "Foci"), "points", [[-c, 0], [c, 0]]),
    ]


def divisibility(n):
    remainder = n % 5
    return remainder, ("Le reste est la distance au multiple de cinq inférieur ou égal à l’entier.",
                       "The remainder is the distance from the multiple of five at or below the integer."), [
        plot(("Multiples de cinq", "Multiples of five"), "points", [[x, 0] for x in range(-15, 26, 5)]),
        plot(("Reste", "Remainder"), "line", [[n - remainder, .4], [n, .4]]),
        marker(n, 0),
    ]


def bezout(a):
    left, right = max(a, 18), min(a, 18)
    remainders = [[1, left], [2, right]]
    while right:
        left, right = right, left % right
        remainders.append([len(remainders) + 1, right])
    return gcd(a, 18), ("Le dernier reste non nul est le PGCD, donc la plus petite combinaison positive.",
                        "The last nonzero remainder is the gcd, the smallest positive integer combination."), [
        plot(("Dividendes et restes successifs", "Successive dividends and remainders"), "bars", remainders),
    ]


def binomial(k):
    values = [[i, comb(5, i) * .3 ** i * .7 ** (5 - i)] for i in range(6)]
    return values[int(k)][1], ("La loi binomiale donne $P(X=k)=\\binom{5}{k}0{,}3^k0{,}7^{5-k}$.",
                              "The binomial law gives $P(X=k)=\\binom{5}{k}0.3^k0.7^{5-k}$."), [
        plot(("Probabilités", "Probabilities"), "bars", values),
        marker(k, values[int(k)][1]),
    ]


def counting(k):
    values = [[i, comb(6, i)] for i in range(7)]
    return values[int(k)][1], ("Les groupes de même taille se comptent avec un coefficient binomial.",
                              "A binomial coefficient counts the groups of a given size."), [
        plot(("Nombre de groupes", "Number of groups"), "bars", values),
        marker(k, values[int(k)][1]),
    ]


def conditional(overlap):
    return overlap / 9, ("On divise l’effectif commun par celui de $A$, qui vaut $9$.",
                         "Divide the overlap by the size of $A$, which is $9$."), [
        plot(("$A$", "$A$"), "bars", [[1, 9], [2, 0]]),
        plot(("$A\\cap B$", "$A\\cap B$"), "bars", [[1, 0], [2, overlap]]),
    ]


def expectation(p):
    return -2 * (1 - p) + 4 * p, ("L’espérance est la moyenne pondérée des deux gains.",
                                "The expected value is the weighted mean of the two payoffs."), [
        plot(("Probabilités des gains", "Payoff probabilities"), "bars", [[-2, 1 - p], [4, p]]),
    ]


EXERCISES = {
    "limites_continuite": Exercise(
        ("Un trou dans la courbe", "A hole in the graph"),
        ("Pour $x\\ne1$, lis la valeur de $f(x)=(2x^2-2x)/(x-1)$.",
         "For $x\\ne1$, read the value of $f(x)=(2x^2-2x)/(x-1)$."),
        ("Abscisse $x$", "Input $x$"), (-3, 3, -6, 6), [-2, -1, 0, .5, .9, 1.1, 1.5, 2], limits),
    "suites": Exercise(
        ("Les termes convergent", "Terms approach a limit"),
        ("Calcule $u_n=2+1/(2n+3)$ au centième près.", "Find $u_n=2+1/(2n+3)$ to the nearest hundredth."),
        ("Rang $n$", "Index $n$"), (0, 8, 1.95, 2.35), range(9), sequence),
    "derivabilite": Exercise(
        ("La pente de la tangente", "Tangent slope"),
        ("Déplace le point de la courbe $y=x^2$ et prédis la pente en $a$.",
         "Move the point on $y=x^2$ and predict the slope at $a$."),
        ("Abscisse $a$", "Point $a$"), (-4, 4, -1, 5), [n / 2 for n in range(-4, 5)], tangent, True),
    "etude_fonctions": Exercise(
        ("Repérer un minimum", "Find a minimum"),
        ("Quelle est l’abscisse du minimum de la parabole ?", "At which x-coordinate does the parabola reach its minimum?"),
        ("Décalage horizontal", "Horizontal shift"), (-6, 6, -2, 6), range(-3, 4), minimum),
    "primitives": Exercise(
        ("Une famille de primitives", "A family of antiderivatives"),
        ("Calcule $F(1)$ pour $F(x)=C-x^2$.", "Find $F(1)$ for $F(x)=C-x^2$."),
        ("Constante $C$", "Constant $C$"), (-3, 3, -10, 5), range(-3, 5), primitive),
    "integrales": Exercise(
        ("L’aire sous une droite", "Area under a line"),
        ("Calcule l’aire sous $y=2x$ entre $0$ et $a$.", "Find the area under $y=2x$ between $0$ and $a$."),
        ("Borne $a$", "Upper bound $a$"), (0, 4, 0, 8), [n / 2 for n in range(1, 9)], integral),
    "logarithme": Exercise(
        ("Lire un logarithme", "Read a logarithm"),
        ("Donne $\\ln(a)$ au centième près.", "Find $\\ln(a)$ to the nearest hundredth."),
        ("Argument positif $a$", "Positive input $a$"), (0, 6, -2, 2), [.25, .5, 1, 2, 3, 4, 5, 6], logarithm),
    "exponentielle": Exercise(
        ("Observer la croissance exponentielle", "Explore exponential growth"),
        ("Donne $e^a$ au centième près.", "Find $e^a$ to the nearest hundredth."),
        ("Exposant $a$", "Exponent $a$"), (-2, 2, 0, 8), [n / 2 for n in range(-4, 5)], exponential),
    "equations_differentielles": Exercise(
        ("Faire varier un taux", "Change a growth rate"),
        ("Si $y'=ay$ et $y(0)=1$, donne $y(0{,}5)$ au centième près.",
         "If $y'=ay$ and $y(0)=1$, find $y(0.5)$ to the nearest hundredth."),
        ("Taux $a$", "Growth rate $a$"), (0, 1, 0, 8), range(-2, 3), differential),
    "nombres_complexes": Exercise(
        ("Une distance dans le plan complexe", "Distance on the complex plane"),
        ("Donne le module de $2+bi$ au centième près.", "Find the modulus of $2+bi$ to the nearest hundredth."),
        ("Partie imaginaire $b$", "Imaginary part $b$"), (-1, 4, -4, 4), range(-3, 4), complex_modulus, True),
    "probabilites": Exercise(
        ("Tirer une boule rouge", "Draw a red ball"),
        ("L’urne contient aussi deux boules bleues. Donne la probabilité d’un tirage rouge au centième près.",
         "The bag also contains two blue balls. Give the probability of drawing red to the nearest hundredth."),
        ("Nombre de boules rouges", "Red ball count"), (0, 3, 0, 9), range(1, 10), probability),
    "statistiques": Exercise(
        ("Une valeur change la moyenne", "One value changes the mean"),
        ("Calcule la moyenne de $4$, $7$, $9$, $10$ et de la valeur choisie.",
         "Find the mean of $4$, $7$, $9$, $10$ and the selected value."),
        ("Cinquième valeur", "Fifth value"), (0, 6, 0, 14), range(5, 14), statistics),
    "geometrie_espace": Exercise(
        ("Construire un pavé droit", "Build a cuboid"),
        ("Prédire le volume du pavé de largeur $3$ et de hauteur $2$.",
         "Predict the volume of the cuboid with width $3$ and height $2$."),
        ("Longueur du pavé", "Cuboid length"), (-2.5, 6.5, -.5, 4), range(1, 7), volume, True),
    "isometries_plan": Exercise(
        ("Tourner une figure", "Rotate a figure"),
        ("Après la rotation, quelle longueur a l’image du côté de longueur $3$ ?",
         "After rotation, how long is the image of the side of length $3$?"),
        ("Angle en degrés", "Angle in degrees"), (-4, 4, -4, 4), range(-180, 181, 45), rotation, True),
    "deplacements_antideplacements": Exercise(
        ("Réfléchir un point", "Reflect a point"),
        ("Le point de départ est $(1,1)$. Donne l’abscisse de son image par symétrie d’axe $x=a$.",
         "The original point is $(1,1)$. Give the x-coordinate of its reflection across $x=a$."),
        ("Abscisse de l’axe $a$", "Mirror position $a$"), (-4, 6, -2, 3), range(-1, 4), reflection, True),
    "similitudes": Exercise(
        ("Agrandir un triangle", "Scale a triangle"),
        ("Le triangle initial a une aire de $2$. Prédis l’aire de son image au centième près.",
         "The original triangle has area $2$. Predict the scaled area to the nearest hundredth."),
        ("Rapport de similitude", "Scale factor"), (-1, 6, -1, 6), [.5, .75, 1, 1.5, 2, 2.5], similarity, True),
    "coniques": Exercise(
        ("Déplacer les foyers d’une ellipse", "Move the foci of an ellipse"),
        ("Le demi-petit axe vaut $3$. Donne la distance du centre à un foyer au centième près.",
         "The semi-minor axis is $3$. Find the distance from the centre to a focus to the nearest hundredth."),
        ("Demi-grand axe", "Semi-major axis"), (-7, 7, -4, 4), [3, 3.5, 4, 4.5, 5, 6], ellipse, True),
    "divisibilite_z": Exercise(
        ("Repérer le reste", "Find the remainder"),
        ("Quel est le reste de la division euclidienne de l’entier choisi par $5$ ?",
         "What is the Euclidean remainder when the selected integer is divided by $5$?"),
        ("Entier choisi", "Selected integer"), (-16, 26, -1, 1), range(-11, 22, 3), divisibility),
    "identite_bezout": Exercise(
        ("Remonter des restes au PGCD", "Find the gcd from the remainders"),
        ("Quelle est la plus petite combinaison linéaire entière strictement positive de $a$ et $18$ ?",
         "What is the smallest positive integer linear combination of $a$ and $18$?"),
        ("Premier entier $a$", "First integer $a$"), (0, 8, 0, 26), [8, 9, 10, 12, 15, 18, 24], bezout),
    "loi_binomiale": Exercise(
        ("Compter les succès probables", "Explore the number of successes"),
        ("Pour cinq essais de probabilité de succès $0{,}3$, donne $P(X=k)$ au centième près.",
         "For five trials with success probability $0.3$, find $P(X=k)$ to the nearest hundredth."),
        ("Nombre de succès $k$", "Number of successes $k$"), (-1, 6, 0, .4), range(6), binomial),
    "denombrement": Exercise(
        ("Former des groupes", "Build groups"),
        ("Combien de groupes de $k$ personnes peut-on former parmi six personnes ?",
         "How many groups of $k$ people can be formed from six people?"),
        ("Taille du groupe $k$", "Group size $k$"), (-1, 7, 0, 23), range(7), counting),
    "probabilites_conditionnelles": Exercise(
        ("Changer l’intersection", "Change the overlap"),
        ("Parmi les neuf membres de $A$, certains sont aussi dans $B$. Donne $P(B\\mid A)$ au centième près.",
         "Some of the nine members of $A$ are also in $B$. Find $P(B\\mid A)$ to the nearest hundredth."),
        ("Effectif de l’intersection", "Size of the overlap"), (0, 3, 0, 10), range(1, 10), conditional),
    "variables_aleatoires": Exercise(
        ("Évaluer un jeu", "Evaluate a game"),
        ("On gagne $4$ avec probabilité $p$ et on perd $2$ sinon. Quelle est l’espérance du gain ?",
         "You win $4$ with probability $p$ and lose $2$ otherwise. What is the expected payoff?"),
        ("Probabilité de gagner $p$", "Win probability $p$"), (-4, 6, 0, 1),
        [i / 10 for i in range(1, 10)], expectation),
}


def lab_activity(topic: str, reply_language: str) -> dict | None:
    exercise = EXERCISES.get(topic)
    if exercise is None:
        return None
    locale = 1 if reply_language == "en" else 0
    frames = []
    for value in exercise.values:
        answer, feedback, series = exercise.calculate(value)
        frames.append({
            "value": value,
            "answer": float(Decimal(str(answer)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "feedback": feedback[locale],
            "series": [
                {"label": item.label[locale], "style": item.style, "paths": list(item.paths)}
                for item in series
            ],
        })
    return {
        "topic": topic,
        "title": exercise.title[locale],
        "instruction": exercise.instruction[locale],
        "parameter": exercise.parameter[locale],
        "bounds": exercise.bounds,
        "frames": frames,
        "equal_axes": exercise.equal_axes,
    }
