---
document_id: math_4eme_ma_102
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Limits and continuity
content_type: course
language: fr
source: OWN WORK - Limites et continuité (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: course -->
## Limites et opérations

Les limites d'une somme, d'un produit ou d'un quotient se déduisent des limites de chaque terme, sauf dans les formes indéterminées : « ∞ − ∞ », « 0 × ∞ », « ∞/∞ » et « 0/0 ». Pour lever une indétermination, on factorise le terme dominant, on simplifie une fraction, ou on multiplie par une expression conjuguée.

## Théorèmes de comparaison

**Théorème des gendarmes.** Si g(x) ≤ f(x) ≤ h(x) au voisinage de a et si g et h ont la même limite finie L en a, alors f a pour limite L en a. Si f(x) ≥ g(x) au voisinage de +∞ et si g tend vers +∞, alors f tend vers +∞.

La limite de référence lim sin(x)/x = 1 quand x tend vers 0 permet de traiter de nombreuses formes « 0/0 » trigonométriques.

<!-- page: 2 -->

<!-- type: definition -->
## Continuité

**Définition (continuité).** Une fonction f définie sur un intervalle contenant a est continue en a si la limite de f(x) quand x tend vers a existe et vaut f(a). Elle est continue sur un intervalle I si elle est continue en tout point de I.

<!-- type: course -->
## Fonctions continues et opérations

Les fonctions polynômes, les fonctions rationnelles sur leur ensemble de définition, les fonctions sinus, cosinus et racine carrée sur leur domaine sont continues. La somme, le produit, le quotient (dénominateur non nul) et la composée de fonctions continues sont continues.

## Théorème des valeurs intermédiaires et bijection

L'image d'un intervalle par une fonction continue est un intervalle. Si f est continue et strictement monotone sur [a, b], alors f réalise une bijection de [a, b] sur l'intervalle d'extrémités f(a) et f(b). En particulier, si f(a)·f(b) < 0, l'équation f(x) = 0 admet une unique solution dans ]a, b[.

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : limite d'une fonction rationnelle

**Énoncé.** Calculer la limite de f(x) = (2x² + 1)/(x² − 3) quand x tend vers +∞.

**Solution.** On factorise par x² : f(x) = (2 + 1/x²)/(1 − 3/x²). Quand x tend vers +∞, 1/x² et 3/x² tendent vers 0, donc f(x) tend vers 2.

## Exercice 2 : lever une forme « ∞ − ∞ »

**Énoncé.** Calculer la limite de √(x² + 1) − x quand x tend vers +∞.

**Solution.** On multiplie par l'expression conjuguée : √(x² + 1) − x = (x² + 1 − x²)/(√(x² + 1) + x) = 1/(√(x² + 1) + x). Le dénominateur tend vers +∞, donc la limite est 0.
