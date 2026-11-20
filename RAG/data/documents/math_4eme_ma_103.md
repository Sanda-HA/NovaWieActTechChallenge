---
document_id: math_4eme_ma_103
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Derivability
content_type: course
language: fr
source: OWN WORK - Dérivabilité et étude de fonctions (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Nombre dérivé et tangente

**Définition (dérivabilité).** f est dérivable en a si le taux d'accroissement (f(x) − f(a))/(x − a) admet une limite finie quand x tend vers a. Cette limite est le nombre dérivé f'(a). La tangente à la courbe au point d'abscisse a a pour équation y = f'(a)(x − a) + f(a).

<!-- type: course -->
## Règles de dérivation

Pour u et v dérivables : (u + v)' = u' + v' ; (uv)' = u'v + uv' ; (u/v)' = (u'v − uv')/v² là où v ne s'annule pas ; (uⁿ)' = n·u'·uⁿ⁻¹ ; (√u)' = u'/(2√u) là où u > 0. Pour une composée, (v∘u)' = u' × (v'∘u).

## Dérivée d'une fonction réciproque

Si f est continue et strictement monotone sur un intervalle I, dérivable en a avec f'(a) ≠ 0, alors sa fonction réciproque f⁻¹ est dérivable en b = f(a) et (f⁻¹)'(b) = 1/f'(a).

<!-- page: 2 -->

<!-- type: course -->
## Théorème des accroissements finis

Si f est continue sur [a, b] et dérivable sur ]a, b[, il existe un réel c de ]a, b[ tel que f(b) − f(a) = f'(c)(b − a). Conséquence, l'inégalité des accroissements finis : si m ≤ f'(x) ≤ M sur [a, b], alors m(b − a) ≤ f(b) − f(a) ≤ M(b − a).

## Variations, extremums et points d'inflexion

Si f' est positive sur un intervalle, f y est croissante ; si f' est négative, f y est décroissante. Si f' s'annule en a en changeant de signe, f admet un extremum local en a. Si f'' s'annule en a en changeant de signe, le point d'abscisse a est un point d'inflexion : la courbe traverse sa tangente.

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice : étude d'une fonction polynôme

**Énoncé.** Étudier les variations de f(x) = x³ − 3x + 1 et préciser ses extremums et son point d'inflexion.

**Solution.** f'(x) = 3x² − 3 = 3(x − 1)(x + 1). f' est positive sur ]−∞, −1] et sur [1, +∞[, négative sur [−1, 1]. Donc f est croissante sur ]−∞, −1], décroissante sur [−1, 1], croissante sur [1, +∞[. Maximum local f(−1) = 3, minimum local f(1) = −1. f''(x) = 6x s'annule en 0 en changeant de signe : le point (0, 1) est un point d'inflexion.
