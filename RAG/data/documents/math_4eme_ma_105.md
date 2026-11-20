---
document_id: math_4eme_ma_105
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Logarithm and exponential
content_type: course
language: fr
source: OWN WORK - Fonctions logarithme et exponentielle (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Fonction logarithme népérien

**Définition.** La fonction logarithme népérien, notée ln, est l'unique primitive de x ↦ 1/x sur ]0, +∞[ qui s'annule en 1. Elle est strictement croissante et ln(e) = 1.

<!-- type: course -->
## Propriétés algébriques et dérivée du logarithme

Pour a et b strictement positifs et n entier : ln(ab) = ln a + ln b ; ln(a/b) = ln a − ln b ; ln(aⁿ) = n·ln a ; ln(√a) = ½·ln a. Si u est dérivable et strictement positive, (ln u)' = u'/u.

## Limites du logarithme

ln x tend vers +∞ quand x tend vers +∞ et vers −∞ quand x tend vers 0⁺. Croissances comparées : ln(x)/x tend vers 0 quand x tend vers +∞, et x·ln x tend vers 0 quand x tend vers 0⁺. De plus ln(1 + x)/x tend vers 1 quand x tend vers 0.

<!-- page: 2 -->

<!-- type: definition -->
## Fonction exponentielle

**Définition.** La fonction exponentielle, notée exp ou x ↦ eˣ, est la fonction réciproque de ln. Elle est définie sur ℝ, à valeurs dans ]0, +∞[, et vérifie ln(eˣ) = x pour tout réel x et e^(ln x) = x pour tout x > 0.

<!-- type: course -->
## Propriétés de l'exponentielle

e^(a + b) = eᵃ·eᵇ, e^(−a) = 1/eᵃ, (eᵃ)ⁿ = e^(na). La fonction exponentielle est sa propre dérivée et, si u est dérivable, (e^u)' = u'·e^u. Limites : eˣ/x tend vers +∞ quand x tend vers +∞, x·eˣ tend vers 0 quand x tend vers −∞, et (eˣ − 1)/x tend vers 1 quand x tend vers 0.

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : équation avec logarithmes

**Énoncé.** Résoudre ln(x − 1) + ln(x + 1) = ln 3.

**Solution.** L'équation est définie pour x > 1. Elle s'écrit ln((x − 1)(x + 1)) = ln 3, soit x² − 1 = 3, donc x² = 4. Comme x > 1, la seule solution est x = 2.

## Exercice 2 : équation avec exponentielles

**Énoncé.** Résoudre e^(2x) − 3eˣ + 2 = 0.

**Solution.** On pose X = eˣ > 0. L'équation devient X² − 3X + 2 = 0, de racines X = 1 et X = 2, toutes deux positives. eˣ = 1 donne x = 0 et eˣ = 2 donne x = ln 2.
