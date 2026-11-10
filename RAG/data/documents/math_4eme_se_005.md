---
document_id: math_4eme_se_005
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: sciences_experimentales
subject: Mathematics
topic: Continuity and derivability exercises
content_type: exercise
language: fr
source: SYNTHETIC SAMPLE - Exercices corrigés (written for the EdNova demo, not an official textbook)
---
<!-- page: 1 -->
## Exercice 1 : continuité d'une fonction définie par morceaux

**Énoncé.** Soit f définie par f(x) = x² + 1 si x ≤ 1 et f(x) = 3x − 1 si x > 1. Étudier la continuité de f en 1.

**Solution.** À gauche : lim f(x) = 1² + 1 = 2 quand x → 1⁻, et f(1) = 2. À droite : lim f(x) = 3×1 − 1 = 2 quand x → 1⁺. Les limites à gauche et à droite sont égales à f(1) = 2, donc f est continue en 1.

## Exercice 2 : existence d'une solution avec le théorème des valeurs intermédiaires

**Énoncé.** Montrer que l'équation x³ + x − 1 = 0 admet une unique solution dans [0, 1].

**Solution.** Posons f(x) = x³ + x − 1. f est continue sur [0, 1] car c'est un polynôme. f(0) = −1 et f(1) = 1 sont de signes contraires, donc d'après le théorème des valeurs intermédiaires l'équation f(x) = 0 admet au moins une solution. De plus f'(x) = 3x² + 1 est strictement positive, donc f est strictement croissante : la solution est unique.

<!-- page: 2 -->
## Exercice 3 : dérivabilité de la valeur absolue

**Énoncé.** La fonction f(x) = |x| est-elle dérivable en 0 ?

**Solution.** Le taux d'accroissement en 0 vaut (|x| − 0)/(x − 0) = |x|/x. Il vaut 1 pour x > 0 et −1 pour x < 0. Les limites à droite et à gauche sont différentes, donc f n'est pas dérivable en 0, bien qu'elle soit continue en 0.

## Exercice 4 : équation de la tangente

**Énoncé.** Déterminer l'équation de la tangente à la courbe de f(x) = x² en x = 3.

**Solution.** f'(x) = 2x donc f'(3) = 6 et f(3) = 9. L'équation de la tangente est y = 6(x − 3) + 9, soit y = 6x − 9.
