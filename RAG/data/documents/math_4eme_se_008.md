---
document_id: math_4eme_se_008
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: sciences_experimentales
subject: Mathematics
topic: Probability and sequences exercises
content_type: exercise
language: fr
source: SYNTHETIC SAMPLE - Exercices de probabilités et suites (written for the EdNova demo, not an official textbook)
---
<!-- page: 1 -->
## Exercice 1 : probabilités totales avec un arbre

**Énoncé.** Une urne U₁ contient 3 boules rouges et 2 vertes ; une urne U₂ contient 1 rouge et 4 vertes. On choisit une urne au hasard (probabilité 1/2 chacune) puis on tire une boule. Quelle est la probabilité de tirer une boule rouge ?

**Solution.** D'après la formule des probabilités totales : p(R) = p(U₁)·p(R | U₁) + p(U₂)·p(R | U₂) = 1/2 × 3/5 + 1/2 × 1/5 = 3/10 + 1/10 = 2/5.

## Exercice 2 : loi binomiale

**Énoncé.** On lance 4 fois une pièce équilibrée. Quelle est la probabilité d'obtenir exactement 2 piles ?

**Solution.** Le nombre de piles X suit la loi binomiale de paramètres n = 4 et p = 1/2. p(X = 2) = C(4, 2) × (1/2)² × (1/2)² = 6 × 1/16 = 3/8.

<!-- page: 2 -->
## Exercice 3 : suite géométrique

**Énoncé.** Soit la suite (uₙ) définie par u₀ = 3 et uₙ₊₁ = 2uₙ. Calculer u₅ et la somme u₀ + u₁ + … + u₅.

**Solution.** (uₙ) est géométrique de raison 2, donc uₙ = 3 × 2ⁿ et u₅ = 3 × 32 = 96. La somme vaut u₀ × (1 − 2⁶)/(1 − 2) = 3 × (1 − 64)/(−1) = 189.

## Exercice 4 : démonstration par récurrence

**Énoncé.** Démontrer que pour tout entier n, 1 + 2 + … + n = n(n + 1)/2.

**Solution.** Initialisation : pour n = 1, la somme vaut 1 et 1×2/2 = 1. Hérédité : supposons la formule vraie au rang n. Alors 1 + … + n + (n + 1) = n(n + 1)/2 + (n + 1) = (n + 1)(n + 2)/2, ce qui est la formule au rang n + 1. La propriété est donc vraie pour tout entier n supérieur ou égal à 1.
