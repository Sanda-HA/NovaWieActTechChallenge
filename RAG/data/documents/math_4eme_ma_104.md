---
document_id: math_4eme_ma_104
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Sequences
content_type: course
language: fr
source: OWN WORK - Suites réelles : convergence, suites adjacentes, récurrence (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Suites monotones et bornées

**Définition.** Une suite (uₙ) est majorée s'il existe un réel M tel que uₙ ≤ M pour tout n, minorée s'il existe m tel que uₙ ≥ m, bornée si elle est majorée et minorée. Elle est croissante si uₙ₊₁ ≥ uₙ pour tout n, décroissante si uₙ₊₁ ≤ uₙ.

<!-- type: course -->
## Théorèmes de convergence

Toute suite croissante et majorée converge ; toute suite décroissante et minorée converge. Si uₙ ≤ vₙ à partir d'un certain rang et si uₙ tend vers +∞, alors vₙ tend vers +∞. Le théorème des gendarmes s'applique aussi aux suites.

La suite géométrique qⁿ tend vers 0 si −1 < q < 1, vers +∞ si q > 1, vaut 1 si q = 1 et n'a pas de limite si q ≤ −1.

## Suites adjacentes

**Définition et théorème.** Deux suites (uₙ) et (vₙ) sont adjacentes si l'une est croissante, l'autre décroissante, et si vₙ − uₙ tend vers 0. Deux suites adjacentes convergent vers la même limite ℓ, et uₙ ≤ ℓ ≤ vₙ pour tout n lorsque (uₙ) est la suite croissante.

<!-- page: 2 -->

<!-- type: course -->
## Suites définies par uₙ₊₁ = f(uₙ)

Si la suite définie par uₙ₊₁ = f(uₙ) converge vers ℓ et si f est continue en ℓ, alors ℓ vérifie f(ℓ) = ℓ. On étudie souvent ces suites en montrant par récurrence qu'elles restent dans un intervalle, puis qu'elles sont monotones.

<!-- type: exercise -->
## Exercice : suite récurrente avec racine carrée

**Énoncé.** Soit u₀ = 1 et uₙ₊₁ = √(uₙ + 2). Montrer que 0 ≤ uₙ ≤ 2, que (uₙ) est croissante, puis déterminer sa limite.

**Solution.** Récurrence : u₀ = 1 est dans [0, 2]. Si 0 ≤ uₙ ≤ 2, alors uₙ + 2 est dans [2, 4], donc uₙ₊₁ est dans [√2, 2], inclus dans [0, 2]. Ensuite uₙ₊₁ − uₙ = (uₙ + 2 − uₙ²)/(√(uₙ + 2) + uₙ) = −(uₙ − 2)(uₙ + 1)/(√(uₙ + 2) + uₙ), qui est positif car uₙ − 2 ≤ 0 et uₙ + 1 > 0. La suite est croissante et majorée par 2, donc elle converge vers ℓ ≥ 0 avec ℓ = √(ℓ + 2), soit ℓ² − ℓ − 2 = 0. Les racines sont 2 et −1 ; comme ℓ ≥ 0, ℓ = 2.
