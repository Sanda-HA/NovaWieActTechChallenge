---
document_id: math_4eme_ma_107
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Arithmetic
content_type: course
language: fr
source: OWN WORK - Divisibilité, PGCD, identité de Bézout, congruences (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Divisibilité et division euclidienne

**Définition.** Un entier a divise un entier b s'il existe un entier k tel que b = ka. **Division euclidienne :** pour a entier et b entier naturel non nul, il existe un unique couple d'entiers (q, r) tel que a = bq + r et 0 ≤ r < b.

**Définition (congruence).** a ≡ b (mod n) signifie que n divise a − b. Les congruences sont compatibles avec l'addition, la multiplication et les puissances.

<!-- type: course -->
## PGCD et algorithme d'Euclide

Si a = bq + r est la division euclidienne de a par b, alors pgcd(a, b) = pgcd(b, r). On répète les divisions jusqu'à obtenir un reste nul : le dernier reste non nul est le PGCD. Deux entiers sont premiers entre eux si leur PGCD vaut 1.

<!-- page: 2 -->

<!-- type: course -->
## Théorèmes de Bézout et de Gauss

**Bézout.** Deux entiers a et b sont premiers entre eux si et seulement s'il existe des entiers u et v tels que au + bv = 1. Plus généralement, il existe des entiers u et v tels que au + bv = pgcd(a, b), et l'équation ax + by = c a des solutions entières si et seulement si pgcd(a, b) divise c.

**Gauss.** Si a divise bc et si a et b sont premiers entre eux, alors a divise c.

## Nombres premiers et petit théorème de Fermat

Un entier p ≥ 2 est premier s'il n'a pas d'autre diviseur positif que 1 et p. **Petit théorème de Fermat :** si p est premier et ne divise pas a, alors a^(p−1) ≡ 1 (mod p).

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : PGCD par l'algorithme d'Euclide

**Énoncé.** Calculer pgcd(252, 198).

**Solution.** 252 = 198×1 + 54 ; 198 = 54×3 + 36 ; 54 = 36×1 + 18 ; 36 = 18×2 + 0. Le dernier reste non nul est 18, donc pgcd(252, 198) = 18.

## Exercice 2 : reste d'une puissance

**Énoncé.** Déterminer le reste de 2¹⁰⁰ dans la division par 7.

**Solution.** 2³ = 8 ≡ 1 (mod 7). Comme 100 = 3×33 + 1, 2¹⁰⁰ = (2³)³³ × 2 ≡ 1 × 2 (mod 7). Le reste est 2.

## Exercice 3 : équation diophantienne

**Énoncé.** Résoudre dans ℤ² l'équation 5x + 3y = 1.

**Solution.** (2, −3) est une solution particulière car 10 − 9 = 1. Par soustraction, 5(x − 2) = −3(y + 3). 3 divise 5(x − 2) et 3 est premier avec 5, donc d'après Gauss 3 divise x − 2 : x = 2 + 3k, puis y = −3 − 5k, avec k entier. Réciproquement, ces couples vérifient l'équation.
