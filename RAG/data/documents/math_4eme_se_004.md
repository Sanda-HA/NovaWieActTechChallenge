---
document_id: math_4eme_se_004
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: sciences_experimentales
subject: Mathematics
topic: Sequences
content_type: course
language: fr
source: SYNTHETIC SAMPLE - Suites numériques (written for the EdNova demo, not an official textbook)
---
<!-- page: 1 -->
## Suites arithmétiques et géométriques

<!-- type: definition -->
**Définition (suite arithmétique).** Une suite (uₙ) est arithmétique s'il existe un réel r, appelé raison, tel que uₙ₊₁ = uₙ + r pour tout n. Alors uₙ = u₀ + n·r.

**Définition (suite géométrique).** Une suite (uₙ) est géométrique s'il existe un réel q, appelé raison, tel que uₙ₊₁ = q × uₙ pour tout n. Alors uₙ = u₀ × qⁿ.

<!-- type: course -->
## Somme des premiers termes

Pour une suite arithmétique, la somme u₀ + u₁ + … + uₙ vaut (n + 1)(u₀ + uₙ)/2. Pour une suite géométrique de raison q différente de 1, elle vaut u₀ × (1 − qⁿ⁺¹)/(1 − q).

<!-- page: 2 -->
## Limite d'une suite

Une suite géométrique de raison q converge vers 0 si −1 < q < 1, converge vers u₀ si q = 1, et diverge si q > 1 (vers l'infini si u₀ est positif) ou si q ≤ −1. Une suite croissante et majorée converge ; une suite décroissante et minorée converge.

## Raisonnement par récurrence

Pour démontrer qu'une propriété P(n) est vraie pour tout entier n à partir de n₀ : on vérifie d'abord P(n₀) (initialisation), puis on suppose P(n) vraie pour un entier n quelconque et on démontre P(n + 1) (hérédité). La propriété est alors vraie pour tout n supérieur ou égal à n₀.
