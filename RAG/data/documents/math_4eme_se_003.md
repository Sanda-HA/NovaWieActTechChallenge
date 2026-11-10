---
document_id: math_4eme_se_003
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: sciences_experimentales
subject: Mathematics
topic: Probability
content_type: course
language: fr
source: SYNTHETIC SAMPLE - Probabilités (written for the EdNova demo, not an official textbook)
---
<!-- page: 1 -->
## Probabilité conditionnelle

<!-- type: definition -->
**Définition (probabilité conditionnelle).** Soient A et B deux événements avec p(B) différent de 0. La probabilité de A sachant B est p(A | B) = p(A ∩ B) / p(B).

<!-- type: course -->
On en déduit la formule des probabilités composées : p(A ∩ B) = p(B) × p(A | B).

## Formule des probabilités totales

Si B₁, B₂, …, Bₙ forment une partition de l'univers, avec des probabilités non nulles, alors pour tout événement A : p(A) = p(B₁)p(A | B₁) + p(B₂)p(A | B₂) + … + p(Bₙ)p(A | Bₙ). On l'utilise avec un arbre pondéré : on multiplie les probabilités le long d'une branche et on additionne les branches qui mènent à A.

<!-- page: 2 -->
## Indépendance

<!-- type: definition -->
**Définition (événements indépendants).** Deux événements A et B sont indépendants si p(A ∩ B) = p(A) × p(B). Si p(B) est non nulle, cela équivaut à p(A | B) = p(A).

<!-- type: course -->
## Épreuves répétées et loi binomiale

On répète n fois, de façon indépendante, une épreuve à deux issues (succès avec la probabilité p, échec avec 1 − p). Si X est le nombre de succès, alors p(X = k) = C(n, k) × p^k × (1 − p)^(n−k) pour k de 0 à n. On dit que X suit la loi binomiale de paramètres n et p ; son espérance est E(X) = n·p.
