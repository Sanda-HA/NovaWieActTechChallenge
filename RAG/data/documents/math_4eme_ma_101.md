---
document_id: math_4eme_ma_101
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Complex numbers
content_type: course
language: fr
source: OWN WORK - Nombres complexes : forme algébrique, module, argument, forme exponentielle (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Forme algébrique et conjugué

**Définition (forme algébrique).** Tout nombre complexe z s'écrit de façon unique z = a + ib avec a et b réels et i² = −1. Le réel a est la partie réelle de z, notée Re(z), et le réel b est sa partie imaginaire, notée Im(z). Le conjugué de z est z̄ = a − ib.

<!-- type: course -->
## Propriétés du conjugué

On a z + z̄ = 2Re(z) et z − z̄ = 2i Im(z). Le produit z·z̄ = a² + b² est un réel positif. Le conjugué d'une somme est la somme des conjugués et le conjugué d'un produit est le produit des conjugués. Un nombre complexe z est réel si et seulement si z̄ = z, et imaginaire pur si et seulement si z̄ = −z.

<!-- type: definition -->
## Module et argument

**Définition (module).** Le module de z = a + ib est le réel positif |z| = √(a² + b²). Dans le plan muni d'un repère orthonormé, |z| est la distance OM, où M est le point d'affixe z.

**Définition (argument).** Pour z non nul, un argument de z est une mesure θ de l'angle orienté entre le vecteur unitaire de l'axe des réels et le vecteur OM. Il est défini à 2π près et vérifie cos θ = a/|z| et sin θ = b/|z|.

<!-- page: 2 -->

<!-- type: course -->
## Règles de calcul sur le module et l'argument

Pour z et z' non nuls : |z·z'| = |z|·|z'| et |z/z'| = |z|/|z'|. Un argument du produit z·z' est arg(z) + arg(z'), un argument du quotient z/z' est arg(z) − arg(z'), à 2π près. Enfin |z̄| = |z| et arg(z̄) = −arg(z).

## Forme trigonométrique et forme exponentielle

Tout complexe non nul de module r et d'argument θ s'écrit z = r(cos θ + i sin θ). On note e^(iθ) = cos θ + i sin θ, d'où la forme exponentielle z = r·e^(iθ). On a e^(iθ)·e^(iθ') = e^(i(θ + θ')) et, pour tout entier n, (e^(iθ))ⁿ = e^(inθ) : c'est la formule de Moivre.

## Équation du second degré

Pour l'équation az² + bz + c = 0 avec a non nul, on calcule Δ = b² − 4ac. Si δ est un complexe tel que δ² = Δ, les solutions sont z = (−b + δ)/(2a) et z = (−b − δ)/(2a). Lorsque les coefficients sont réels et Δ < 0, on peut prendre δ = i√(−Δ) et les deux solutions sont conjuguées.

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : forme exponentielle et puissance

**Énoncé.** Écrire z = 1 + i sous forme exponentielle, puis calculer z⁸.

**Solution.** |z| = √(1² + 1²) = √2. On cherche θ avec cos θ = 1/√2 et sin θ = 1/√2, donc θ = π/4. Ainsi z = √2·e^(iπ/4). Par la formule de Moivre, z⁸ = (√2)⁸·e^(i8π/4) = 16·e^(i2π) = 16.

## Exercice 2 : équation à coefficients réels

**Énoncé.** Résoudre dans ℂ l'équation z² − 2z + 5 = 0.

**Solution.** Δ = (−2)² − 4×1×5 = −16 < 0. On prend δ = 4i, car (4i)² = −16. Les solutions sont z = (2 + 4i)/2 = 1 + 2i et z = (2 − 4i)/2 = 1 − 2i, qui sont conjuguées.
