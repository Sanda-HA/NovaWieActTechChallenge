---
document_id: math_4eme_ma_108
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Probability
content_type: course
language: fr
source: OWN WORK - Probabilités conditionnelles et variables aléatoires (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: course -->
## Règles de calcul

Pour deux événements A et B : p(A ∪ B) = p(A) + p(B) − p(A ∩ B) et p(Ā) = 1 − p(A). En situation d'équiprobabilité, p(A) = card(A)/card(Ω).

<!-- type: definition -->
## Probabilité conditionnelle et indépendance

**Définition.** Si p(B) ≠ 0, la probabilité de A sachant B est p_B(A) = p(A ∩ B)/p(B). Deux événements A et B sont indépendants si p(A ∩ B) = p(A)·p(B).

<!-- type: course -->
## Formule des probabilités totales

Si B₁, …, Bₙ forment une partition de l'univers avec des probabilités non nulles, alors p(A) = p(B₁)·p_B₁(A) + … + p(Bₙ)·p_Bₙ(A). Un arbre pondéré traduit cette formule : on multiplie le long d'une branche et on additionne les branches qui mènent à A.

<!-- page: 2 -->

<!-- type: definition -->
## Variable aléatoire, espérance et variance

**Définition.** Une variable aléatoire X associe un réel à chaque issue. Sa loi donne les probabilités pᵢ = p(X = xᵢ). Son espérance est E(X) = Σ xᵢ·pᵢ, sa variance V(X) = E(X²) − (E(X))² et son écart-type σ(X) = √V(X).

<!-- type: course -->
## Loi binomiale

On répète n fois, de façon indépendante, une épreuve à deux issues dont le succès a la probabilité p. Le nombre X de succès suit la loi binomiale B(n, p) : p(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ pour k de 0 à n. Son espérance est E(X) = np et sa variance V(X) = np(1 − p).

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : tirage simultané

**Énoncé.** Une urne contient 4 boules rouges et 6 boules noires. On tire simultanément 3 boules. X est le nombre de boules rouges tirées. Donner la loi de X et son espérance.

**Solution.** Il y a C(10, 3) = 120 tirages équiprobables. p(X = 0) = C(6, 3)/120 = 20/120 ; p(X = 1) = 4×C(6, 2)/120 = 60/120 ; p(X = 2) = C(4, 2)×6/120 = 36/120 ; p(X = 3) = C(4, 3)/120 = 4/120. La somme vaut 1. E(X) = (0×20 + 1×60 + 2×36 + 3×4)/120 = 144/120 = 6/5.

## Exercice 2 : loi binomiale

**Énoncé.** On lance 5 fois un dé équilibré. Quelle est la probabilité d'obtenir exactement deux fois le 6 ?

**Solution.** Le nombre de 6 suit B(5, 1/6). p(X = 2) = C(5, 2)·(1/6)²·(5/6)³ = 10 × 125/7776 = 1250/7776 ≈ 0,161.
