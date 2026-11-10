---
document_id: math_4eme_ma_001
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Nombres complexes
content_type: course
language: fr
source: Livre scolaire - Mathématiques, 4e année secondaire, section Mathématiques, Tome 2 (Ministère de l'Éducation, Tunisie) - manuel officiel distribué publiquement
---

<!-- page: 6 -->
## I. Rappels et compléments - I.1 Définition et opérations sur les nombres complexes

<!-- type: exercise -->
**Activité 1.** Déterminer l'écriture cartésienne de chacun des nombres complexes ci-dessous.

- (2 − 2i)(1 + i)² ;
- (−√2 − i√3)(√2 + i√3) ;
- (1 + i)^4 (1 − i)^20.

<!-- type: definition -->
**Théorème et définition (rappel).** Il existe un ensemble appelé ensemble des nombres complexes, noté ℂ, et vérifiant les propriétés ci-dessous.

1. L'ensemble ℂ contient l'ensemble des nombres réels ℝ.
2. Il existe un élément de ℂ, noté i, tel que i² = −1.
3. L'ensemble ℂ est muni d'une addition et d'une multiplication qui vérifient les mêmes propriétés que l'addition et la multiplication dans ℝ.
4. Tout élément z de ℂ s'écrit de façon unique sous la forme z = a + ib, où a et b sont des réels.

**Conséquences.** Soit z = a + ib et z' = a' + ib', où a, a', b et b' sont des réels. Alors :

- z = z', si et seulement si, a = a' et b = b'.
- z = 0, si et seulement si, a = b = 0.
- z est réel, si et seulement si, b = 0.
- z est imaginaire, si et seulement si, a = 0.

<!-- type: exercise -->
**Activité 2.** Soit les nombres complexes z = 1 + 2i et z' = i.

1. Donner l'écriture cartésienne de zz', (zz')², (zz')³, (zz')^4, ainsi que de leurs conjugués.
2. Donner l'écriture cartésienne de z/z', (z/z')³, ainsi que de leurs conjugués.

<!-- type: definition -->
**Définition.** Soit z = a + ib, où a et b sont des réels. Le conjugué de z est le nombre complexe z̅ = a − ib.

<!-- page: 7 -->
## Propriétés du conjugué

<!-- type: course -->
**Propriétés.** Pour tous nombres complexes z et z' :

- z + z' conjugué = z̅ + z̅' ; zz' conjugué = z̅ z̅' ; conjugué de z^n = (z̅)^n, n ∈ ℕ*.
- Pour tout nombre complexe z et tout nombre complexe non nul z' : conjugué de (z/z') = z̅ / z̅' ; conjugué de (1/z'^n) = 1/(z̅')^n, n ∈ ℤ.
- z + z̅ = 2 Re(z) ; z − z̅ = 2i Im(z) ; z z̅ = (Re(z))² + (Im(z))².
- z = z̅, si et seulement si, z est réel.
- z = −z̅, si et seulement si, z est imaginaire.

## I.2 Affixe d'un point, affixe d'un vecteur

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Placer les points A, B et C d'affixes respectives i, 2i, 1 + 2i.
2. Donner les affixes de leurs symétriques par rapport à l'axe des abscisses.
3. Donner les affixes de leurs symétriques par rapport au point O.
4. Donner les affixes de leurs symétriques par rapport à l'axe des ordonnées.
5. Donner les affixes des vecteurs OB − 2OC, −AB + (3/2) AC.
6. Déterminer l'affixe du centre de gravité du triangle ABC.

<!-- type: definition -->
**Définition.** Le plan est muni d'un repère orthonormé direct (O, u, v).

- L'affixe d'un point M(a, b) du plan est le nombre complexe z = a + ib, noté Aff(M) ou z_M. On dit aussi que le point M(a, b) est l'image de z.
- Soit w un vecteur et M et N deux points tels que w = MN. Alors l'affixe du vecteur w est le nombre complexe z, noté Aff(w), vérifiant z = z_N − z_M.
- Pour tous vecteurs w et w₁ et tous réels α et β : Aff(αw + βw₁) = α Aff(w) + β Aff(w₁).

<!-- type: exercise -->
**Activité 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe 2 − 2i et M un point d'affixe z.

1. Donner une condition nécessaire et suffisante sur z pour que M appartienne à la droite (OA).
2. En déduire l'ensemble des points M d'affixe z = k(2 − 2i), k ∈ ℝ.

<!-- page: 8 -->
## Colinéarité et orthogonalité de vecteurs (affixes)

<!-- type: definition -->
**Propriété.** Soit w et w₁ deux vecteurs tels que w₁ est non nul. Les vecteurs w et w₁ sont colinéaires, si et seulement si, l'écriture cartésienne du quotient de l'affixe de w par l'affixe de w₁ est un réel.

<!-- type: course -->
**Démonstration.** Soit w et w₁ deux vecteurs tels que w₁ non nul. Les vecteurs w et w₁ sont colinéaires, si et seulement si, il existe un réel α tel que w = αw₁. La relation w = αw₁ équivaut à Aff(w) = α Aff(w₁), ou encore à Aff(w)/Aff(w₁) = α. Le théorème en découle.

<!-- type: exercise -->
**Activité 3.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit f l'application du plan dans lui-même qui à tout point M d'affixe z associe le point M' d'affixe z' = 2(z + conj(z)) + i conj(z).

1. Déterminer et construire l'ensemble des points M', images des points M d'abscisse nulle.
2. Déterminer et construire l'ensemble des points M', images des points M d'ordonnées nulles.

<!-- type: exercise -->
**Activité 4.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe 1 + 2i et M un point d'affixe z.

1. Donner une condition nécessaire et suffisante sur z pour que M appartienne à la perpendiculaire à la droite (OA) en O.
2. En déduire l'ensemble des points M d'affixe z = ik(1 + 2i), k ∈ ℝ.

<!-- type: definition -->
**Propriété.** Soit w et w₁ deux vecteurs tels que w₁ est non nul. Les vecteurs w et w₁ sont orthogonaux, si et seulement si, le quotient de l'affixe de w par l'affixe de w₁ est imaginaire.

<!-- page: 9 -->
<!-- type: course -->
**Démonstration.** Soit w et w₁ deux vecteurs tels que w₁ est non nul. On désigne par a + bi et a' + b'i, avec a, b, a' et b' réels, les affixes respectives de w et w₁. Les vecteurs w et w₁ sont orthogonaux, si et seulement si, aa' + bb' = 0. Or le quotient de l'affixe de w par l'affixe de w₁ vaut :

(a + bi)/(a' + b'i) = (a + bi)(a' − b'i)/(a'² + b'²) = (aa' + bb' + (a'b − ab')i)/(a'² + b'²).

On en déduit que w et w₁ sont orthogonaux, si et seulement si, ce quotient est imaginaire.

<!-- type: exercise -->
**Activité 5.** Le plan est muni d'un repère orthonormé direct (O, u, v). Déterminer et construire l'ensemble des points M d'affixe z tels que (z − i)/(z − 1) soit imaginaire.

## I.3 Module d'un nombre complexe

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct (O, u, v). On considère les points A et B d'affixes respectives z_A = 1 + i√3 et z_B = 1 − i√3.

1. Vérifier que le triangle OAB est isocèle en O.
2. On désigne par D le point tel que OADB soit un losange. Déterminer l'affixe de D.

<!-- type: exercise -->
**Activité 2.** Soit z = 2 − i et z' = −3 + 4i. Calculer les modules de z + z' ; zz' ; z/z' ; z^4 ; (conj(zz'))².

<!-- type: definition -->
**Définition.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit z = a + ib et M(a, b) le point d'affixe z. On appelle module de z le réel positif, noté |z|, défini par |z| = OM = √(a² + b²). Pour tous points M et N d'affixes z_M et z_N : |z_N − z_M| = MN.

<!-- type: course -->
**Propriétés.** Soit deux nombres complexes z et z'.

- |z| = 0, si et seulement si, z = 0 ;
- |z z'| = |z||z'| ; |z̅| = |z| ; |z|² = z z̅ ; |z^n| = |z|^n, n ∈ ℕ* ;
- |z + z'| ≤ |z| + |z'| ;
- |kz| = |k||z|, k ∈ ℝ ;
- |1/z| = 1/|z|, z ≠ 0 ; |z'/z| = |z'|/|z|, z ≠ 0 ; |1/z^n| = 1/|z^n|, z ≠ 0 et n ∈ ℤ.

<!-- page: 10 -->
<!-- type: exercise -->
**Activité 3.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Déterminer l'ensemble des points M d'affixe z tels que |z − 1 + 2i| = 2.
2. Déterminer l'ensemble des points M d'affixe z tels que |z + 2 − i| = |z̅ − 2 + 2i|.
3. Déterminer l'ensemble des points M d'affixe z tels que |2z + 2 − i| = √2 / 2.
4. Déterminer l'ensemble des points M d'affixe z tels que |iz + 2 + i| = 2.

## I.4 Argument d'un nombre complexe non nul

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Placer les points A, B, C et D d'affixes respectives z_A = −i, z_B = 4, z_C = 2 + 2i et z_D = −1 + i.
2. Soit A₁, B₁, C₁ et D₁ les symétriques respectifs de A, B, C et D par rapport à l'axe des abscisses. Déterminer un argument de chacun de leurs affixes.
4. Reprendre la question précédente pour les symétriques respectifs de A, B, C et D par rapport à O.
5. Reprendre la question précédente pour les symétriques respectifs de A, B, C et D par rapport à l'axe des ordonnées.

<!-- type: definition -->
**Définition.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit z un nombre complexe non nul et M son image. On appelle argument de z et on note arg(z) toute mesure de l'angle orienté (u, OM) modulé 2π.

<!-- type: exercise -->
**Activité 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit f l'application du plan dans lui-même qui à tout point M d'affixe z associe le point M' d'affixe z' = 2(z − conj(z)) + 2iz.

1. a. Déterminer l'ensemble des points M tels que arg(z) ≡ 0 [2π].
   b. Déterminer et construire l'ensemble des points M', images par f des points M tels que arg(z) ≡ 0 [2π].
2. Déterminer et construire l'ensemble des points M', images par f des points M tels que arg(z) ≡ π [2π].
3. Déterminer et construire l'ensemble des points M', images par f des points M tels que arg(z) ≡ π/2 [2π].

<!-- page: 11 -->
<!-- type: exercise -->
**Activité 3.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit M un point distinct de O tel que l'angle orienté (u, OM) ≡ θ [2π]. On désigne par M₁, M₂ et M₃ les symétriques respectifs de M par rapport à l'axe des abscisses, au point O et à l'axe des ordonnées. Déterminer (u, OM₁) ; (u, OM₂) ; (u, OM₃) à l'aide de θ.

<!-- type: course -->
**Propriétés.** Soit z un nombre complexe non nul et k un réel non nul.

- arg(z̅) ≡ −arg(z) [2π].
- arg(−z) ≡ π + arg(z) [2π].
- Si k > 0 alors arg(kz) ≡ arg(z) [2π].
- Si k < 0 alors arg(kz) ≡ π + arg(z) [2π].

## I.5 Ecriture trigonométrique

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct. Soit z = −2√3 + 2i. Déterminer l'écriture trigonométrique de z et placer le point d'affixe z. En déduire l'écriture trigonométrique de chacun des nombres complexes z̅, −z, (1/2)z et −(3/2)z, puis placer leurs points images.

<!-- type: definition -->
**Définition.** Soit z un nombre complexe non nul tel que arg(z) ≡ θ [2π]. Alors z = |z| (cos θ + i sin θ). L'écriture précédente est appelée écriture trigonométrique de z. Si M est l'image de z dans le repère orthonormé direct (O, u, v), alors M appartient au cercle de centre O et de rayon |z| et à la demi-droite [OB) telle que l'angle orienté (u, OB) ≡ θ [2π].

<!-- page: 12 -->
## Ecriture trigonométrique (suite)

<!-- type: exercise -->
**Activité 2.** Soit les nombres complexes z = (√3 − i√2)/2 et z' = (1 − i√2)/2. Donner une valeur approchée de leurs arguments à 10⁻² près.

<!-- type: course -->
**Propriété.** Soit z un nombre complexe non nul tel z = a + ib, a et b des réels. Alors arg(z) ≡ θ [2π], si et seulement si, cos θ = a/√(a² + b²) et sin θ = b/√(a² + b²).

<!-- type: exercise -->
**Activité 3.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A, B et C les points d'affixes respectives z_A = 4, z_B = 1 + i√3 et z_C = 1 − i√3.

1. Montrer que le triangle ABC est équilatéral.
2. Donner les écritures trigonométriques de z_A, z_B et z_C.
3. Soit D le point tel que OABD est un parallélogramme. Donner l'écriture trigonométrique de l'affixe z_D de D.
4. Soit K l'image de C par le quart de tour direct de centre O. Donner l'écriture trigonométrique de l'affixe z_K de K.

## I.6 Propriétés d'un argument d'un nombre complexe non nul

<!-- type: exercise -->
**Activité 1.** Soit z et z' deux nombres complexes non nuls tels que z = |z| (cos θ + i sin θ) et z' = |z'| (cos θ' + i sin θ').

1. Donner les écritures trigonométriques de zz', 1/z et z'/z.
2. a. Montrer par récurrence, sur l'entier naturel n, que z^n = |z|^n (cos nθ + i sin nθ).
   b. En déduire que pour tout entier naturel n, z^(−n) = |z|^(−n) (cos(−nθ) + i sin(−nθ)).

<!-- type: course -->
**Propriétés.** Soit deux nombres complexes non nuls z et z'.

- arg(zz') ≡ arg(z) + arg(z') [2π].
- arg(1/z) ≡ −arg(z) [2π].
- arg(z'/z) ≡ arg(z') − arg(z) [2π].
- arg(z^n) ≡ n arg(z) [2π], n ∈ ℤ.
- Pour tout nombre complexe non nul z et tout entier n, z^n = |z|^n (cos nθ + i sin nθ). La formule précédente est appelée formule de Moivre.

<!-- page: 13 -->
<!-- type: exercise -->
**Activité 2.** Donner l'écriture trigonométrique de chacun des nombres complexes ci-dessous.

- (1 + i)^6 ;
- (1 − i)^9 ( (√3 + i)^5 / (√3 − i)^8 ) ;
- (2√3 − 2i)^6 (1 + i√3)³.

<!-- type: course -->
**Exercice résolu 1.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit M₁ le point d'affixe z = 1 − i. Pour tout entier naturel non nul n, on désigne par M_n le point d'affixe z^n.

1. Donner l'écriture trigonométrique de z^n, n ≥ 1.
2. Construire les points M₁, M₂, M₃ et M₄.
3. Déterminer les entiers naturels n tels que les points M_n soient sur la droite d'équation y = x. Le point M_2071 appartient-il à la droite d'équation y = x ?

**Solution.**

1. On peut écrire 1 − i = √2 (cos(−π/4) + i sin(−π/4)). On déduit alors de la formule de Moivre que z^n = (√2)^n (cos(−nπ/4) + i sin(−nπ/4)).
2. Le point M₁ a pour affixe z = √2 (cos(−π/4) + i sin(−π/4)). Par suite M₁ est le point d'intersection du cercle de centre O et de rayon √2 avec la demi-droite [OA₁) telle que l'angle orienté (u, OA₁) ≡ −π/4 [2π].
Le point M₂ a pour affixe z² = 2 (cos(−π/2) + i sin(−π/2)). Par suite M₂ est le point d'intersection du cercle de centre O et de rayon 2 avec la demi-droite [OA₂) telle que l'angle orienté (u, OA₂) ≡ −π/2 [2π].
Le point M₃ a pour affixe z³ = 2√2 (cos(−3π/4) + i sin(−3π/4)). Par suite M₃ est le point d'intersection du cercle de centre O et de rayon 2√2 avec la demi-droite [OA₃) telle que l'angle orienté (u, OA₃) ≡ −3π/4 [2π].
Le point M₄ a pour affixe z^4 = 4 (cos π + i sin π) = −4.
3. Un point M_n appartient à la droite d'équation y = x, si et seulement si, l'angle orienté (u, OM_n) ≡ π/4 + 2kπ, k ∈ ℤ ou l'angle orienté (u, OM_n) ≡ π + π/4 + 2kπ, k ∈ ℤ. Par suite M_n appartient à D : y = x, si et seulement si, −nπ/4 ≡ π/4 + 2kπ, k ∈ ℤ ou −nπ/4 ≡ 5π/4 + 2kπ, k ∈ ℤ. On en déduit que M_n appartient à D, si et seulement si, (n + 1) est multiple de 8 ou (n + 5) est multiple de 8. L'entier 2072 étant divisible par 8, on en déduit que M_2071 appartient à D.

## I.7 Angles orientés et nombres complexes

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A et B deux points distincts d'affixes respectives z_A et z_B.

1. En considérant le point E tel que AB = OE, montrer que l'angle orienté (u, AB) ≡ arg(z_B − z_A) [2π].
2. Soit C et D deux points distincts.
   a. Vérifier que l'angle configuré (AB, CD) ≡ (u, CD) − (u, AB) [2π].
   b. En déduire que l'angle configuré (AB, CD) ≡ arg( (z_D − z_C)/(z_B − z_A) ) [2π].

<!-- type: definition -->
**Théorème.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A, B, C et D des points d'affixes respectives z_A, z_B, z_C et z_D et tels que AB ≠ 0 et CD ≠ 0. Alors l'angle orienté (u, AB) ≡ arg(z_B − z_A) [2π] et l'angle configuré (AB, CD) ≡ arg( (z_D − z_C)/(z_B − z_A) ) [2π].

<!-- page: 15 -->
<!-- type: course -->
**Conséquence.** (z_D − z_C)/(z_B − z_A) = (CD/AB) (cos θ + i sin θ), avec l'angle configuré (AB, CD) ≡ θ [2π].

<!-- type: exercise -->
**Activité 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe 1, B le point d'affixe i.

1. Déterminer et construire l'ensemble des points M d'affixe z tels que arg(z − i) ≡ π/3 [2π].
2. Déterminer et construire l'ensemble des points M d'affixe z tels que arg( (z − i)/(z − 1) ) ≡ π/2 [2π].

<!-- type: course -->
**Exercice résolu 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe 2 − i. Déterminer et construire l'ensemble des points M d'affixe z tels que arg( (z − 2 + i)³ ) ≡ π/2 [2π].

**Solution.** On sait qu'un argument n'est défini que pour un nombre complexe non nul. Par suite la relation arg( (z − 2 + i)³ ) ≡ π/2 [2π] n'a de sens que si M est distinct de A. De plus, arg( (z − 2 + i)³ ) ≡ π/2 [2π], si et seulement si, 3 arg(z − 2 + i) = π/2 + 2kπ, k ∈ ℤ. On en déduit que arg( (z − 2 + i)³ ) ≡ π/2 [2π], si et seulement si, arg(z − 2 + i) = π/6 + 2kπ/3, k ∈ ℤ.

Remarquons que :

- π/6 + 2kπ/3 ≡ π/6 [2π], si k = 3n, n ∈ ℤ ;
- π/6 + 2kπ/3 ≡ π/6 + 2π/3 [2π], si k = 3n + 1, n ∈ ℤ ;
- π/6 + 2kπ/3 ≡ π/6 + 4π/3 [2π], si k = 3n + 2, n ∈ ℤ.

On en déduit que, arg( (z − 2 + i)³ ) ≡ π/2 [2π], si et seulement si, arg(z − 2 + i) ≡ π/6 [2π] ou arg(z − 2 + i) ≡ 5π/6 [2π] ou arg(z − 2 + i) ≡ 3π/2 [2π]. De plus, arg(z − 2 + i) = l'angle orienté (u, AM) [2π].

<!-- page: 16 -->
<!-- type: course -->
L'ensemble cherché est donc la réunion de trois demi-droites [AB), [AC) et [AD) privées de A telles que l'angle orienté (u, AB) ≡ π/6 [2π], l'angle orienté (u, AC) ≡ 5π/6 [2π] et l'angle orienté (u, AD) ≡ 3π/2 [2π].

<!-- type: course -->
**Exercice résolu 3.** Le plan est muni d'un repère orthonormé direct (O, u, v). Déterminer et construire l'ensemble E des points M d'affixe z tels que arg( (z − 1)/(z + i) ) ≡ π/3 [2π].

**Solution.** Soit M un point d'affixe z tel que z ≠ 1 et z ≠ −i, alors arg( (z + i)/(z − 1) ) = l'angle configuré (MA, MB) [2π], où A et B sont les points d'affixes respectives 1 et −i. Par suite, M est un point de l'ensemble E, si et seulement si, l'angle configuré (MA, MB) ≡ π/3 [2π]. Ainsi, l'ensemble E est l'arc BA, privé des points A et B, du cercle C passant par A et B et tangent en A à la demi-droite [AT) définie par l'angle configuré (AT, AB) ≡ π/3 [2π].

## II. Ecriture exponentielle d'un nombre complexe non nul

<!-- type: exercise -->
**Activité 1.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Soit les points A, B et C d'affixes respectives z_A = i, z_B = (1/2)(√3 + i) et z_C = (√2/2)(1 − i).
   a. Donner les écritures trigonométriques de z_A, z_B et z_C.
   b. En déduire que les points A, B et C appartiennent au cercle trigonométrique.
2. Soit les points E, F et G du cercle trigonométrique tels que l'angle orienté (u, OE) ≡ −3π/2 [2π], l'angle orienté (u, OF) ≡ 5π/4 [2π] et l'angle orienté (u, OG) ≡ −2π/3 [2π]. Donner les écritures trigonométriques de leurs affixes.

<!-- page: 17 -->
## Notation e^(iθ)

<!-- type: definition -->
**Notation.** Pour tout réel θ, on note e^(iθ) le nombre complexe cos θ + i sin θ. Dans le plan muni d'un repère orthonormé direct (O, u, v), un point M appartient au cercle trigonométrique, si et seulement si, il a pour affixe z = e^(iθ), où l'angle orienté (u, OM) ≡ θ [2π].

<!-- type: course -->
**Conséquences.**

- e^(i0) = 1, e^(iπ/2) = i, e^(−iπ/2) = −i, e^(iπ) = −1.
- Pour tout réel θ et tout entier k, e^(iθ) = e^(i(θ + 2kπ)).
- Pour tout réel θ, le module de e^(iθ) est 1, conj(e^(iθ)) = e^(−iθ) et −e^(iθ) = e^(i(θ + π)).

<!-- type: exercise -->
**Activité 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). On donne les nombres complexes z = e^(−iπ/3) et z' = e^(i 3π/2).

1. Donner le module et un argument de chacun des nombres complexes −z, z̅, zz', 1/z, z/z' et z^n, n ∈ ℤ.
2. Ecrire sous la forme e^(iθ) les nombres complexes zz', z̅, z/z', z^n, n ∈ ℤ.

<!-- type: course -->
Les propriétés ci-dessous découlent des propriétés de l'argument du produit, de l'inverse ou du quotient de deux nombres complexes non nuls.

**Propriétés.** Soit deux réels θ et θ' :

- e^(iθ) e^(iθ') = e^(i(θ + θ')) ;
- 1/e^(iθ) = e^(−iθ) ;
- (e^(iθ))/(e^(iθ')) = e^(i(θ − θ')) ;
- (e^(iθ))^n = e^(inθ), n ∈ ℤ.

<!-- type: course -->
**Exercice résolu 4.** Le plan est muni d'un repère orthonormé direct (O, u, v). On considère le nombre complexe z = 1 + i + e^(iθ), θ ∈ [0, π], et on désigne par E l'ensemble des points M du plan d'affixe z.

1. Vérifier que le point B d'affixe z_B = 1 + 2i appartient à E.
2. Déterminer l'ensemble E.

<!-- page: 18 -->
<!-- type: course -->
**Solution (suite de l'exercice résolu 4).**

1. On sait que i = e^(iπ/2). On peut alors écrire z_B = 1 + 2i = 1 + i + e^(iπ/2). Ce qui prouve que B appartient à l'ensemble E.
2. Soit A le point d'affixe z_A = 1 + i et M un point du plan complexe d'affixe z. M appartient à E, si et seulement si, z − z_A = e^(iθ), θ ∈ [0, π]. On déduit alors, des relations |z − z_A| = AM et arg(z − z_A) = l'angle orienté (u, AM) [2π], que M appartient à E si, et seulement si, AM = 1 et l'angle orienté (u, AM) ≡ θ [2π], où θ est un réel de [0, π]. L'ensemble E est donc le demi-cercle de diamètre [IJ] avec I(2, 1), J(0, 1) et contenant le point B.

<!-- type: exercise -->
**Activité 3.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Donner l'écriture trigonométrique des nombres complexes z₁ = 2i, z₂ = −3i, z₃ = −5/2, z₄ = √3(1 + i) et z₅ = (−2√3 + 2i)/5.
2. Ecrire chacun des nombres complexes précédents sous la forme re^(iθ), avec r > 0.

<!-- type: definition -->
**Théorème et définition.** Tout nombre complexe non nul z, s'écrit sous la forme z = re^(iθ), où r = |z| et arg(z) ≡ θ [2π]. L'écriture z = re^(iθ), r > 0, est appelée écriture exponentielle de z.

<!-- type: exercise -->
**Activité 4.** On considère les deux nombres complexes z = √3 + i et z' = −1 + i. Donner l'écriture exponentielle des nombres complexes z, z̅, z', z̅', zz', 1/z, z⁵, z/z' et z'².

<!-- type: exercise -->
**Activité 5.**

1. Ecrire sous forme exponentielle les nombres complexes z = √3 − i et z' = 1 + i.
2. En déduire l'écriture cartésienne de (1 + i)^14 / (√3 − i)^8.

<!-- page: 19 -->
<!-- type: exercise -->
**Activité 6.**

1. Vérifier que pour tout réel θ, 1 + e^(iθ) = (e^(−iθ/2) + e^(iθ/2)) e^(iθ/2).
2. Donner l'écriture exponentielle des nombres complexes z = 1 + e^(i 2π/5) et z' = 1 + e^(i 3π/5).

<!-- type: exercise -->
**Activité 7.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit A et B les points d'affixes respectives 1 et −1. On considère un point M d'affixe z = e^(iα), avec α ∈ [0, π].

1. Donner, à l'aide de α, la mesure principale de l'angle orienté (u, AM) et l'expression de AM.
2. Donner, à l'aide de α, la mesure principale de l'angle orienté (u, BM) et l'expression de BM.
3. En déduire le module et un argument de chacun des nombres complexes Z₁ = 1 + z et Z₂ = 1 − z.

## III. Equation z^n = a, n ≥ 1, a ∈ ℂ*

<!-- type: exercise -->
**Activité 1.**

1. Soit z un nombre complexe non nul d'argument 2kπ/3, k ∈ ℤ. Montrer que :
   a. si k = 3n, alors arg(z) ≡ 0 [2π] ;
   b. si k = 3n + 1, alors arg(z) ≡ 2π/3 [2π] ;
   c. si k = 3n + 2, alors arg(z) ≡ 4π/3 [2π].
2. Dans cette question, on se propose de résoudre dans ℂ l'équation (E) : z³ = 1.
   a. Montrer que z est une solution de (E), si et seulement si, z = e^(2ikπ/3), k ∈ ℤ.
   b. Déduire de la première question que (E) possède exactement trois solutions distinctes.
3. Soit n un entier naturel non nul. Donner les solutions dans ℂ, de l'équation z^n = 1.

<!-- type: definition -->
**Théorème et définition.** Pour tout entier naturel non nul n, l'équation z^n = 1 admet dans ℂ n solutions distinctes définies par z_k = e^(i 2kπ/n), l'entier k appartenant à {0, 1, ..., (n − 1)}. Les solutions de l'équation z^n = 1 sont appelées racines n-ièmes de l'unité.

<!-- page: 20 -->
<!-- type: course -->
**Conséquence.** Le plan est muni d'un repère orthonormé direct (O, u, v). Lorsque n ≥ 3, les points images des racines n-ièmes de l'unité sont les sommets d'un polygone régulier inscrit dans le cercle trigonométrique (pour n = 6 : les points d'affixes e^(i0), e^(iπ/3), e^(i 2π/3), e^(iπ), e^(i 4π/3), e^(i 5π/3)).

<!-- type: exercise -->
**Activité 2.** On pose j = (−1 + i√3)/2.

1. Vérifier que j est une racine cubique de l'unité.
2. Vérifier les égalités suivantes j³ = 1, j² = conj(j) et 1 + j + j² = 0.
3. Montrer que pour tout entier naturel n, j^(3n) = 1, j^(3n+1) = j et j^(3n+2) = j̅.

<!-- type: course -->
**Exercice résolu 5.**

1. Vérifier que pour tout nombre complexe z, (z − 1)(z^4 + z³ + z² + z + 1) = z⁵ − 1.
2. En déduire les solutions z₁, z₂, z₃ et z₄ de l'équation (E) : z^4 + z³ + z² + z + 1 = 0.
3. a. Ecrire z₂, z₃ et z₄ à l'aide de z₁.
   b. En déduire les valeurs de z₁ + z₂ + z₃ + z₄ et de 1/z₁ + 1/z₂ + 1/z₃ + 1/z₄.

**Solution.**

1. Il suffit de développer le premier membre.
2. Pour z ≠ 1, z^4 + z³ + z² + z + 1 = (z⁵ − 1)/(z − 1). L'équation (E) équivaut à z⁵ − 1 = 0 et z ≠ 1. Il en résulte que les solutions de (E) sont les racines 5-ièmes de l'unité autres que 1, à savoir z₁ = e^(i 2π/5), z₂ = e^(i 4π/5), z₃ = e^(i 6π/5) et z₄ = e^(i 8π/5).
3. a. Il découle de la question précédente que z₂ = z₁², z₃ = z₁³ et z₄ = z₁^4.
   b. En remarquant que z₁ + z₁² + z₁³ + z₁^4 = −1, on déduit de la question précédente que z₁ + z₂ + z₃ + z₄ = −1.

<!-- page: 21 -->
<!-- type: course -->
(De l'exercice résolu 5.) Il est facile de vérifier, compte tenu de la question 3.a, que z₁⁵(1/z₁ + 1/z₂ + 1/z₃ + 1/z₄) = z₁ + z₁² + z₁³ + z₁^4. Les égalités z₁⁵ = 1 et z₁ + z₁² + z₁³ + z₁^4 = −1 impliquent que 1/z₁ + 1/z₂ + 1/z₃ + 1/z₄ = −1.

<!-- type: exercise -->
**Activité 3.** Résoudre dans ℂ, l'équation ( z/(1 + i) )² = 1. En déduire les solutions dans ℂ, de l'équation z² = 2i.

<!-- type: exercise -->
**Activité 4.** On se propose de résoudre dans ℂ l'équation (E) : z³ = 8i.

1. Montrer que z est une solution de (E), si et seulement si, z/(2 e^(iπ/6)) est une racine cubique de l'unité.
2. En déduire que l'équation (E) possède exactement trois solutions. Vérifier que les solutions de (E) sont z_k = 2 e^(i(π/6 + 2kπ/3)), où k est un entier appartenant à {0, 1, 2}.

<!-- type: definition -->
**Théorème et définition.** Soit a un nombre complexe non nul d'argument θ et n un entier naturel non nul. L'équation z^n = a admet dans ℂ, n solutions distinctes définies par z_k = r e^(i θ/n + 2kπ/n), k ∈ {0, 1, ..., n − 1}, où r est le réel strictement positif tel que r^n = |a|. Ces solutions sont appelées les racines n-ièmes du nombre complexe a.

<!-- type: course -->
**Démonstration.** Posons a = |a| e^(iθ). Considérons le réel r > 0 tel que r^n = |a|. On peut alors écrire a = r^n (e^(i θ/n))^n. Il en résulte que l'équation z^n = a est équivalente à l'équation ( z/(r e^(iθ/n)) )^n = 1.

<!-- page: 22 -->
<!-- type: course -->
On en déduit que z est solution de l'équation z^n = a, si et seulement si, z/(r e^(iθ/n)) est une racine n-ième de l'unité. Par conséquent, l'équation z^n = a admet n solutions distinctes de la forme z_k = r e^(i(θ/n + 2kπ/n)), k ∈ {0, 1, ..., n − 1}, où r est le réel tel que r^n = |a|.

**Conséquence.** Le plan complexe est muni d'un repère orthonormé direct (O, u, v). Lorsque n ≥ 3, les points images des racines n-ièmes d'un nombre complexe non nul sont les sommets d'un polygone régulier inscrit dans le cercle de centre O et de rayon r tel que r^n = |a| (pour l'équation z^6 = |a| e^(iθ) : les points M_k d'affixes r e^(i(θ + 2kπ)/6), k ∈ {0, 1, 2, 3, 4, 5}).

<!-- type: exercise -->
**Activité 5.** Déterminer les racines carrées, puis les racines quatrièmes du nombre complexe u = −1 + i√3.

<!-- type: exercise -->
**Activité 6.** Le plan est muni d'un repère orthonormé direct (O, u, v). Dans la figure ci-contre ABCDE est un pentagone régulier inscrit dans le cercle de centre O et de rayon 2 et A(2, 0).

1. Donner les affixes des points B, C, D et E.
2. Déterminer dans chacun des cas ci-dessous l'ensemble des points d'affixe z tels que :
   a. arg(z) ≡ 4π/5 [2π] ;
   b. arg(z̅) ≡ 2π/5 [2π] ;
   c. arg(−2z) ≡ 3π/5 [2π].

<!-- type: exercise -->
**Activité 7.** Soit le nombre complexe z = √(2 − √2) + i √(2 + √2).

1. Déterminer le module et un argument de z².
2. En déduire l'écriture trigonométrique de z.

<!-- page: 23 -->
## IV. Résolution dans ℂ, de l'équation az² + bz + c = 0, a ≠ 0

<!-- type: exercise -->
**Activité 1 (recherche des racines carrées d'un nombre complexe par une méthode algébrique).** Soit le nombre complexe u = 3 − 4i. On se propose de déterminer les racines carrées de u. Remarquons d'abord que la recherche d'un argument du nombre complexe u ne conduit pas à un angle "remarquable". Déterminons alors, sous forme algébrique, les solutions de l'équation z² = u. On pose z = x + iy avec x et y deux nombres réels.

1. Montrer que l'équation z² = u équivaut à : { x² − y² = 3 ; 2xy = −4 ; x² + y² = 5 }.
2. Vérifier que les couples (x, y) solutions de ce système sont (2, −1) et (−2, 1).
3. Conclure.

<!-- type: exercise -->
**Activité 2.** Déterminer, dans chaque cas, les racines carrées de u = −8 + 6i et u = 1 − 2√2 i.

<!-- type: exercise -->
**Activité 3.** On considère dans ℂ, l'équation (E) : z² + 2iz − 7/4 − i = 0.

1. Montrer que z² + 2iz − 7/4 − i = 0, si et seulement si, (z + i)² = (3 + 4i)/4.
2. Vérifier que ( (2 + i)/2 )² = (3 + 4i)/4.
3. En déduire les solutions de l'équation (E).

<!-- type: exercise -->
**Activité 4.** Soit a, b et c des nombres complexes tels que a ≠ 0. On se propose de résoudre dans ℂ, l'équation (E) : az² + bz + c = 0.

1. Montrer que l'équation az² + bz + c = 0 est équivalente à l'équation ( z + b/(2a) )² = (b² − 4ac)/(4a²).
2. On pose Δ = b² − 4ac.
   a. Montrer que si Δ = 0, alors l'équation (E) admet une unique solution que l'on déterminera.
   b. On suppose que Δ ≠ 0.

<!-- page: 24 -->
<!-- type: course -->
(De l'activité 4.) Dans ce cas, le nombre complexe Δ admet deux racines carrées opposées δ et −δ. Montrer que l'équation az² + bz + c = 0 est équivalente à l'équation ( z + (b − δ)/(2a) ) ( z + (b + δ)/(2a) ) = 0. En déduire les solutions de (E).

Cette activité nous permet d'énoncer le théorème suivant.

<!-- type: definition -->
**Théorème.** Soit a, b et c des nombres complexes tels que a ≠ 0. L'équation az² + bz + c = 0, admet dans ℂ, deux solutions (éventuellement confondues) définies par z₁ = (−b + δ)/(2a) et z₂ = (−b − δ)/(2a), où δ est une racine carrée du discriminant Δ = b² − 4ac.

<!-- type: course -->
**Conséquences.** Si z₁ et z₂ sont les solutions de az² + bz + c = 0, a ≠ 0, alors az² + bz + c = a (z − z₁)(z − z₂), z₁ + z₂ = −b/a et z₁ z₂ = c/a.

<!-- type: course -->
**Méthode de résolution, dans ℂ, de l'équation (E) : az² + bz + c = 0, a ≠ 0.**

- Si c = 0, (E) s'écrit z(az + b) = 0 et admet comme solutions z₁ = 0 et z₂ = −b/a.
- Si b = 0, (E) s'écrit z² = −c/a et la résolution de (E) se ramène à la recherche des racines carrées du nombre complexe −c/a.
- Si bc ≠ 0, on détermine une racine carrée δ du discriminant Δ = b² − 4ac. Les solutions de (E) sont z₁ = (−b + δ)/(2a) et z₂ = (−b − δ)/(2a).

<!-- type: exercise -->
**Activité 5.** Résoudre dans ℂ, les équations ci-dessous.

a. z² − (1 − i)z + 2 − 2i = 0.
b. 1 + z + z² = 0.
c. 1 − z + z² = 0.

<!-- type: exercise -->
**Activité 6.** Déterminer les nombres complexes z₁ et z₂ vérifiant { z₁ + z₂ = 1 + 2i ; z₁ z₂ = −1 + i }.

<!-- page: 25 -->
## V. Exemples d'équations de degré supérieur ou égal à 3

<!-- type: exercise -->
**Activité 1.** Soit a₁, a₂, ..., a_n des nombres complexes tels que a_n ≠ 0, n ≥ 2. Soit f : z ↦ a_n z^n + a_(n−1) z^(n−1) + ... + a₁ z + a₀, z ∈ ℂ. Soit (E) l'équation f(z) = 0.

1. Montrer que si z₀ est une solution de (E), alors pour tout nombre complexe z, f(z) = 0 équivaut à a_n z^n + a_(n−1) z^(n−1) + ... + a₁ z = a_n z₀^n + a_(n−1) z₀^(n−1) + ... + a₁ z₀.
2. En déduire que si z₀ est une solution de (E), alors (E) est équivalente à l'équation (z − z₀) g(z) = 0, où g(z) est de la forme a_n z^(n−1) + b_(n−2) z^(n−2) + ... + b₀, avec b₀, b₁, ..., b_(n−2) complexes.

<!-- type: definition -->
**Théorème.** Soit a₁, a₂, ..., a_n des nombres complexes tels que a_n ≠ 0, n ≥ 2. Soit P(z) = a_n z^n + a_(n−1) z^(n−1) + ... + a₁ z + a₀. Si z₀ est un zéro de P, alors P(z) = (z − z₀) g(z), où g(z) est de la forme a_n z^(n−1) + b_(n−2) z^(n−2) + ... + b₀, avec b₀, b₁, ..., b_(n−2) complexes.

<!-- type: course -->
**Exercice résolu 6.** On considère, dans ℂ, l'équation (E) : z³ + (1 − 4i)z² − (7 + 3i)z + 6i − 2 = 0.

1. Montrer que l'équation (E) admet une solution imaginaire et la déterminer.
2. Résoudre l'équation (E).

**Solution.**

1. Posons z₀ = iy avec y réel. z₀ est solution de (E) si, et seulement si, (iy)³ + (1 − 4i)(iy)² − (7 + 3i)iy + 6i − 2 = 0. Il suit que, z₀ est solution de (E) si, et seulement si, −y² + 3y − 2 + i(−y³ + 4y² − 7y + 6) = 0. On en déduit que z₀ est solution de (E), si et seulement si, { −y² + 3y − 2 = 0 (*) ; −y³ + 4y² − 7y + 6 = 0 (**) }. L'équation (*) admet deux solutions réelles qui sont 1 et 2. Seul le réel 2 vérifie l'équation (**). Il en résulte que le réel 2 est l'unique solution du système précédent.

<!-- page: 26 -->
<!-- type: course -->
On en déduit que z₀ = 2i est l'unique solution imaginaire pure de (E). Il suit que z³ + (1 − 4i)z² − (7 + 3i)z + 6i − 2 = (z − 2i)(z² + bz + c), avec b et c des nombres complexes. Un développement et une identification terme à terme nous donnent b = 1 − 2i et c = −3 − i. L'équation (E) s'écrit alors (z − 2i)(z² + (1 − 2i)z − 3 − i) = 0, ce qui équivaut à z = 2i ou z² + (1 − 2i)z − 3 − i = 0. Les solutions de l'équation (E₁) : z² + (1 − 2i)z − 3 − i = 0 sont z₁ = −2 + i et z₂ = 1 + i. Il en résulte que l'équation (E) a pour ensemble de solutions S = {2i, −2 + i, 1 + i}.

<!-- type: exercise -->
**Activité 2.** Soit f(z) = z³ + (2 + 2i)z² + (2 + i)z + 3 + i, où z ∈ ℂ.

1. Vérifier que f(i) = 0.
2. En déduire les solutions, dans ℂ, de l'équation f(z) = 0.

## VI. Nombres complexes et trigonométrie

<!-- type: definition -->
**Théorème.** Pour tout réel x et pour tout entier n, (cos x + i sin x)^n = cos(nx) + i sin(nx). (Formule de Moivre).
Pour tout réel x, cos x = (e^(ix) + e^(−ix))/2 et sin x = (e^(ix) − e^(−ix))/(2i). (Formules d'Euler).

<!-- type: course -->
Les formules de Moivre et d'Euler permettent d'établir un grand nombre de formules trigonométriques. Elles permettent aussi d'exprimer des puissances de cos x et sin x à l'aide de cos(nx) et sin(nx).

<!-- type: exercise -->
**Activité 1.** Soit k un entier. Montrer que pour tout réel x différent de (2k + 1)π/2, (1 + i tan x)/(1 − i tan x) = e^(2ix).

<!-- type: exercise -->
**Activité 2.**

1. En utilisant la formule de Moivre et la formule du binôme de Newton, montrer que cos 3x = cos³x − 3 cos x sin²x et sin 3x = 3 cos²x sin x − sin³x.
2. Exprimer cos 4x et sin 4x en fonction de puissances de cos x et de sin x.

<!-- page: 27 -->
<!-- type: course -->
**Exercice résolu 7.** Linéariser sin⁵x, x ∈ ℝ. (En transformant une expression contenant une puissance de cos x ou de sin x sous une forme qui ne contient aucun produit de fonctions circulaires, on dit qu'on a linéarisé l'expression donnée.)

**Solution.** En utilisant une formule d'Euler, on obtient sin⁵x = (1/(2i)⁵)(e^(ix) − e^(−ix))⁵. La formule du binôme de Newton, donne :

(e^(ix) − e^(−ix))⁵ = e^(5ix) − C₁ e^(4ix) e^(−ix) + C₂ e^(3ix) e^(−2ix) − C₃ e^(2ix) e^(−3ix) + C₄ e^(ix) e^(−4ix) − e^(−5ix).

On obtient alors, (e^(ix) − e^(−ix))⁵ = (e^(5ix) − e^(−5ix)) − 5(e^(3ix) − e^(−3ix)) + 10(e^(ix) − e^(−ix)). Il en résulte que sin⁵x = (1/16)(sin 5x − 5 sin 3x + 10 sin x).

<!-- type: exercise -->
**Activité 3.** Linéariser cos³x, sin³x, sin³x cos^4x où x est un réel.

<!-- page: 28 -->
## QCM - VRAI-FAUX

<!-- type: exercise -->
**QCM.** Cocher la réponse exacte. Le plan est muni d'un repère orthonormé direct (O, u, v). Soit les points M(z) et M'(z').

1. a. La distance MM' est égale à :

- |z − z'| ;
- | |z| − |z'| | ;
- |z + z'|.

b. Si arg(z) ≡ arg(z') [2π] alors :

- O, M et M' sont alignés ;
- z = z' ;
- |z| = |z'|.

2. A, B et C sont trois points d'affixes respectives z_A, z_B et z_C tels que z_B − z_A = 4i (z_C − z_A). Alors :

- ABC est isocèle ;
- (AB) et (AC) sont perpendiculaires ;
- (AB) et (AC) sont parallèles.

3. L'équation z² − 2z + 2 = 0 a pour solutions :

- z₁ = 1 − i et z₂ = 1 + i ;
- z₁ = 2i et z₂ = −i ;
- z₁ = 1 − i et z₂ = 2 + i.

<!-- type: exercise -->
**VRAI - FAUX.** Répondre par vrai ou faux en justifiant la réponse.

1. Une équation du second degré dans ℂ admet toujours deux racines opposées.
2. Soit z et a deux nombres complexes non nuls. z^4 = a^4, si et seulement si, z = a ou z = −a.
3. Soit z₁ et z₂ deux nombres complexes non réels. Le conjugué du nombre complexe Z = z₁ + i z₂ est conj(Z) = z₁ − i z₂.
4. Deux nombres complexes non nuls ayant même argument et même partie réelle sont égaux.
5. Soit z un nombre complexe. Si z³ est réel alors nécessairement z est réel.
6. Soit z et z' deux nombres complexes non nuls. Si |z| = |z'| alors nécessairement z = z' ou z = −z'.

<!-- page: 29 -->
## Exercices et problèmes (1 à 9)

<!-- type: exercise -->
**Exercice 1.** Déterminer dans chacun des cas ci-dessous, les nombres complexes z sous forme algébrique.

a. (z − i)/(z + i) = 2i.
b. (z + i)/(2z) = 1 − i.
c. (2z + i)/(iz) = 2iz/(1 − z).

**Exercice 2.** Le plan est muni d'un repère orthonormé direct (O, u, v). Représenter, dans chacun des cas ci-dessous, les points A, B, S, P, I et J d'affixes respectives z_A, z_B, z_A + z_B, z_A z_B, 1/z_A et 1/z_B.

a. |z_A| = 3, arg(z_A) ≡ π/4 [2π] ; |z_B| = 1 et arg(z_B) ≡ π/2 [2π].
b. |z_A| = 2, arg(z_A) ≡ π/4 [2π] ; |z_B| = 4 et arg(z_B) ≡ π [2π].

**Exercice 3.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit z ≠ −i et M le point d'affixe z. On considère le nombre complexe Z = (z − i)/(z + i).

1. Déterminer et construire l'ensemble des points M tels que Z soit réel.
2. Déterminer et construire l'ensemble des points M tels que Z soit imaginaire.

**Exercice 4.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit z un nombre complexe non nul et M le point d'affixe z. On considère le nombre complexe Z = (z + 1)/z.

1. Déterminer et construire l'ensemble des points M tels que Z soit réel.
2. Déterminer et construire l'ensemble des points M tels que Z soit imaginaire.

**Exercice 5.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit Z un nombre complexe.

1. Déterminer et construire l'ensemble E = { M(z) ∈ P tel que |z − 1| / |z − i| = 1 }.
2. En déduire l'ensemble F = { M(z) ∈ P tel que |conj(2z − 2)| / |z − i| = 2 }.

**Exercice 6.** Le plan est muni d'un repère orthonormé direct (O, u, v). Déterminer l'ensemble des points M d'affixe z tels que arg(z) − arg(z − 1) ≡ π/2 [2π], z ∈ ℂ \ {0, 1}.

**Exercice 7.** Donner l'écriture algébrique des nombres complexes 2 e^(3iπ/2), −e^(3iπ/4) et 3 e^(−2iπ/3).

**Exercice 8.** Donner l'écriture exponentielle des nombres complexes :

a. (3 e^(−iπ/5))³ ; 2 e^(iπ/5) / (3 e^(iπ)) ; ( e^(3iπ/8) )^4 · ( e^(−iπ) )³.
b. −3 + 3i ; 2√3 − 2i ; (1 − i)⁵ ; (1 − i + √2)/(1 + i + √2).

**Exercice 9.** Soit le nombre complexe a = (√6 + √2)/2 + i (√6 − √2)/2.

1. Donner l'écriture exponentielle de a². En déduire l'écriture exponentielle de a.
2. Donner les valeurs exactes de cos(π/12) et sin(π/12).
3. Le plan est muni d'un repère orthonormé direct (O, u, v).
   a. Construire les points A et B d'affixes respectives a et i a².
   b. Déterminer l'ensemble E des points M d'affixes z tels que arg( (iz + a²)/(z − a) ) ≡ −11π/12 + kπ, k ∈ ℤ. Vérifier que O appartient à E. Tracer E.

<!-- page: 30 -->
<!-- type: exercise -->
**Exercice 10.** On considère les nombres complexes z₁ = e^(i π/6), z₂ = 2 e^(−i 2π/3) et z₃ = √2 e^(−i π/4). Donner l'écriture exponentielle de i z₁, z₂/(1 + i), z₁ z₂, z₁/z₂, z₁ z₂ z₃, z₃^4, (z₂³)/(z₁⁶) et conj(z₂)/z₃.

**Exercice 11.** Déterminer les racines cubiques de 4√2 (i + 1).

**Exercice 12.** Déterminer les racines quatrièmes de 8√2 (−1 − i).

**Exercice 13.** Déterminer les racines cinquièmes de 32 i.

**Exercice 14.** Déterminer les racines sixièmes de 32 (i − √3).

**Exercice 15.** Résoudre dans ℂ chacune des équations ci-dessous.

a. z² + 18z + 1681 = 0.
b. z² − (5 − i)z + 8 − i = 0.
c. z² + 4(i − 1)z + 2(4 − i) = 0.
d. z² + (1 − 3i)z − 2(1 + i) = 0.

**Exercice 16.** Résoudre dans ℂ chacune des équations ci-dessous.

a. z^4 + 6z² + 25 = 0.
b. z^4 + 4z² − 77 = 0.

**Exercice 17.** On considère dans ℂ l'équation (E) : z³ − 8z² + 24z − 32 = 0.

1. Vérifier que z₀ = 4 est une solution de (E).
2. Résoudre (E). On notera z₁ la solution de (E) ayant une partie imaginaire positive et z₂ sa solution ayant une partie imaginaire négative. Déterminer la forme exponentielle de z₁ et z₂.

**Exercice 18.** On considère dans ℂ l'équation (E) : z³ − (3 + 4i)z² − 4(1 − 3i)z + 12 = 0.

1. Montrer que l'équation admet une racine réelle que l'on déterminera.
2. Résoudre dans ℂ l'équation (E).

**Exercice 19.** On considère dans ℂ l'équation (E) : z³ = 2 + 11 i.

1. Vérifier que z₀ = 2 + i est une solution de (E).
2. Résoudre dans ℂ l'équation (E).

**Exercice 20.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. Résoudre dans ℂ l'équation z conj(z) + 3(z − conj(z)) = 13 + 18i, on notera z₁ et z₂ les solutions avec Re(z₁) < 0.
2. Représenter les points A et B d'affixes respectives z₁ et z₂.
3. Déterminer l'affixe du point G centre de gravité du triangle OAB.
4. Déterminer l'affixe du point C pour que OABC soit un parallélogramme.

**Exercice 21.** Le plan est muni d'un repère orthonormé direct (O, u, v).

1. On considère dans ℂ l'équation (E) : z³ − (4 + i)z² + (7 + i)z − 4 = 0.
   a. Montrer que l'équation (E) admet une racine réelle que l'on déterminera.
   b. Résoudre dans ℂ l'équation (E).
2. a. Représenter les points A, B et C d'affixes respectives 1, 2 + 2i et 1 − i.
   b. Déterminer le module et un argument de (2 + 2i)/(1 − i). En déduire la nature du triangle OBC.
   c. Que représente la droite (OA) pour le triangle OBC ?
   d. Soit D le point tel que CD = CO et l'angle configuration (CO, CD) ≡ −π/2 [2π]. Quelle est la nature de OCDB ?

<!-- page: 31 -->
<!-- type: exercise -->
**Exercice 22.**

1. Déterminer les racines quatrièmes de l'unité.
2. Résoudre dans ℂ l'équation ((z − i)/(z + i))³ + ((z − i)/(z + i))² + ((z − i)/(z + i)) + 1 = 0.

**Exercice 23.** Résoudre dans ℂ, l'équation 1 + z + z² + ... + z⁶ = 0. Calculer cos(2π/7) + cos(4π/7) + cos(6π/7).

**Exercice 24.**

1. Montrer que pour tout entier n > 0 et tout nombre complexe z, 1 − z^(n+1) = (1 − z)(1 + z + z² + ... + z^n).
2. Montrer que pour tout réel θ, 1 − e^(iθ) = −2i sin(θ/2) e^(iθ/2).
3. Soit un entier n ≥ 1 et un réel θ ≠ 2kπ, k un entier relatif. On pose S = 1 + cos θ + cos 2θ + ... + cos nθ et S' = sin θ + sin 2θ + ... + sin nθ.
   a. Montrer que S + iS' = (1 − e^(i(n+1)θ))/(1 − e^(iθ)).
   b. En déduire que S = [sin((n + 1)θ/2)/sin(θ/2)] cos(n θ/2) et S' = [sin((n + 1)θ/2)/sin(θ/2)] sin(n θ/2).

**Exercice 25.** Le plan est muni d'un repère orthonormé direct (O, u, v). On considère l'application f du plan dans lui même, qui à tout point d'affixe z, associe le point M' d'affixe z' telle que z' = z² − 4z. On désigne par A et B les points d'affixes respectives 1 − i et 3 + i.

1. a. Calculer les affixes des points A' et B' images des points A et B par f.
   b. On suppose que deux points ont la même image par f. Montrer qu'ils sont confondus ou que l'un est l'image de l'autre par une symétrie centrale que l'on précisera.
2. Soit I le point d'affixe −3.
   a. Montrer que OMIM' est un parallélogramme, si et seulement si, z² − 3z + 3 = 0.
   b. Résoudre dans ℂ, l'équation z² − 3z + 3 = 0.
3. a. Exprimer (z' + 4) en fonction de (z − 2). En déduire une relation entre |z' + 4| et |z − 2| puis entre arg(z' + 4) et arg(z − 2).
   b. On considère les points J et K d'affixes respectives 2 et −4. Montrer que l'image de tout point M du cercle de centre J et de rayon 2 appartient à un même cercle que l'on déterminera.
   c. Soit E le point d'affixe z_E = −4 − 3i. Donner la forme trigonométrique de z_E + 4 et montrer qu'il existe deux points dont l'image par f est le point E. Préciser l'écriture algébrique de l'affixe de ces deux points.

**Exercice 26.** Le plan P est muni d'un repère orthonormé direct (O, u, v). On désigne par A, B et C les points d'affixes respectives 2i, −1 et i. On considère l'application f de P \ {A} dans P qui, à tout point M de P \ {A} d'affixe z, associe le point M' d'affixe z' telle que z' = (z + 1)/(z − 2i).

1. a. On désigne par C', l'image de C par l'application f. Quelle est la nature du quadrilatère ACBC' ?
   b. Montrer que le point C admet un unique antécédent par l'application f que l'on notera C''. Quelle est la nature du triangle BCC'' ?
2. Donner une interprétation géométrique du module et d'un argument de z'.
3. a. Déterminer l'ensemble E des points M tels que z' soit un réel strictement négatif.
   b. Déterminer l'ensemble F des points M tels que z' soit un nombre imaginaire non nul.
   c. Déterminer l'ensemble G des points M tels que M' appartiennent au cercle de centre O et de rayon 1.

<!-- page: 32 -->
<!-- type: exercise -->
**Exercice 27.** Soit le nombre complexe z = e^(iθ) − i avec θ ∈ [0, π/2 [

1. On désigne par M et M' les points images respectives de z et conj(z) dans un repère orthonormé direct (O, u, v). Déterminer l'affixe du point N pour que OMNM' soit un losange.
2. a. Montrer que z = 2 cos(θ/2 + π/4) e^(i(θ/2 − π/4)).
   b. Mettre z/conj(z) sous la forme exponentielle.
   c. En déduire la valeur de θ pour que OMNM' soit un carré.
   d. Construire le carré OMNM' pour la valeur de θ trouvée.

**Exercice 28.** Le plan P est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe 1. On considère l'application f de P \ {A} dans P qui, à tout point M de P \ {A} d'affixe z, associe le point M' d'affixe z' telle que z' = (conj(z) + 3)/(z − 1).

1. Soit B le point d'affixe 1 − i.
   a. Déterminer l'affixe du point B' image de B par f.
   b. Placer les points B et B' dans le plan P.
2. Soit C le point d'affixe 1 + 2 e^(iπ/6).
   a. Calculer AC.
   b. Déterminer l'angle orienté (u, AC).
   c. En déduire la construction du point C.
   d. Montrer que f(C) = C.
3. a. Calculer (z̅ − 1)(z' − 1).
   b. En déduire que AM · AM' = 4.
   c. Déterminer l'image par f du cercle de centre A et de rayon 2.

**Exercice 29.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit a = (√3 + 1)/4 + i (√3 − 1)/4. On désigne par A₀ le point d'affixe z₀ = 6 + 6i et pour tout entier naturel n, on désigne par A_n le point d'affixe z_n = a^n z₀.

1. Ecrire z₁ et a² sous forme algébrique puis sous forme exponentielle.
2. Exprimer z₃ et z₇ à l'aide de z₁ et a².
3. En déduire l'écriture exponentielle de z₃ et z₇.
4. Placer les points A₀, A₁, A₃ et A₇.

**Exercice 30.** Le plan P est muni d'un repère orthonormé direct (O, u, v). On considère la transformation f du plan qui à tout point M d'affixe z non nulle associe le point M' d'affixe z' = 1/z.

1. Déterminer l'ensemble des points fixes de f.
2. Démontrer que pour tout point M distinct de O, les points O, M et M' sont alignés et que OM · OM' = 1.
3. a. Montrer que les points A, B et C d'affixes respectives 4, 2 + 2i, 2 − 2i appartiennent au cercle C de centre le point I d'affixe 2 et de rayon 2.
   b. Calculer les affixes des points A', B' et C' images par f des points A, B et C. Montrer que les points A', B' et C' appartiennent à une même droite dont on donnera une équation.
4. a. Montrer pour tout nombre complexe non nul z, |z − 2| = 2, si et seulement si, |1/2 − z'| = |z'|.
   b. En déduire l'image par f du cercle C.

**Exercice 31.** Le plan est muni d'un repère orthonormé direct (O, u, v). On désigne par A, le point d'affixe z_A = 1, et par C le cercle de centre A et de rayon 1.

I. Soit F le point d'affixe 2, B le point d'affixe z_B = 1 + e^(iπ/3) et E le point d'affixe 1 + conj(z_B)².

1. a. Montrer que le point B appartient à C (le cercle de centre A et de rayon 1).
   b. Déterminer une mesure en radians de l'angle orienté (AF, AB). Placer le point B.
2. a. Déterminer la forme exponentielle des nombres complexes (z_B − z_A) et (z_E − z_A).
   b. En déduire que les points A, B et E sont alignés.
3. Placer le point E.

<!-- page: 33 -->
<!-- type: exercise -->
**Exercice 31 (suite).** II. Pour tout nombre complexe z différent de 1, on considère les points M et M' d'affixes respectives z et z' où z' = 1 + z².

1. Pour tout z ≠ 0 et z ≠ 1, donner à l'aide des points A, M et M', une interprétation géométrique d'un argument du nombre complexe (z' − 1)/(z − 1).
2. En déduire que A, M et M' sont alignés, si et seulement si, z²/(z − 1) est un réel.

**Exercice 32.** Le plan est muni d'un repère orthonormé direct (O, u, v). On considère la suite (α_n) de nombres réels définie par α₀ = π/2 et pour tout entier naturel n, α_(n+1) = α_n + 5π/6. On désigne par M_n le point du cercle de centre O et de rayon 1 tel que l'angle orienté (u, OM_n) ≡ α_n [2π].

1. Placer les points M_n, pour 0 ≤ n ≤ 8.
2. On note z_n l'affixe de M_n. Ecrire z_n sous forme exponentielle.
3. Montrer que pour tout entier n, les points M_n et M_(n+6) sont diamétralement opposés.
4. Montrer que pour tout entier n, les points M_n et M_(n+12) sont confondus.
5. Montrer que pour tout entier n, z_(n+4) = e^(−2iπ/3) z_n. En déduire que pour tout entier n, le triangle M_n M_(n+4) M_(n+8) est équilatéral.

**Exercice 33.**

1. Résoudre dans ℂ l'équation Z^4 = −1.
2. Soit θ ∈ ℝ \ {kπ avec k ∈ ℤ}. Montrer que (z + i)/(z − i) = e^(iθ) équivaut à z = 1 / tan(θ/2).
3. En déduire les solutions de l'équation (z + i)^4 = −(z − i)^4.

**Exercice 34.** Le plan P est muni d'un repère orthonormé direct (O, u, v). Soit A le point d'affixe −i. On considère l'application f de P \ {A} dans P qui, à tout point M de P \ {A} d'affixe z, associe le point M' d'affixe z' telle que z' = i conj(z)/(i − z).

1. Déterminer l'ensemble des points invariants par f.
2. a. Montrer que pour tout z ∈ ℂ \ {−i}, (z' + i)(conj(z) − i) = 1.
   b. En déduire que AM' · AM = 1 et que M' ∈ [AM).
3. a. Soit θ ∈ ℝ \ {−π/2 + 2kπ, k ∈ ℤ}. Montrer que l'affixe de f(M) est égale à e^(iθ), si et seulement si, z = −(1/2)( tan(θ/2 − π/4) + i ).
   b. Résoudre dans ℂ l'équation z³ = 1.
   c. En déduire les solutions de l'équation i z³ = (−i − z)³.

**Exercice 35.** Le plan est muni d'un repère orthonormé direct (O, u, v). Soit a un réel et l'équation (E) : z² + a(1 − i)z − i a² = 0.

1. Résoudre dans ℂ, l'équation (E). On notera z₁ la solution réelle et z₂ l'autre solution.
2. On désigne par A et B les points d'affixes respectives 2 + z₁ et z₂. Soit le carré de sens direct ACBD.
   a. Montrer que le point C est fixe.
   b. Déterminer et construire l'ensemble des points D lorsque a varie dans ℝ.

**Exercice 36.**

1. a. Résoudre dans ℂ l'équation Z² − 2√3 Z + 4 = 0.
   b. Ecrire les solutions trouvées sous forme exponentielle.

<!-- page: 34 -->
<!-- type: exercise -->
**Exercice 36 (suite).**

2. On pose U = (1/2)[(1 − i) + √3(1 + i)].
   a. Calculer U².
   b. Déterminer la forme trigonométrique de U.
   c. En déduire alors les valeurs de cos(π/12) et sin(π/12).

3. Pour tout Z ∈ ℂ, on pose P(Z) = Z³ − 2(√3 + i)Z² + 4(1 + i√3)Z − 8i.
   a. Montrer que l'équation P(Z) = 0 admet une solution imaginaire pure que l'on déterminera.
   b. Résoudre dans ℂ l'équation P(Z) = 0.

4. Dans le plan muni d'un repère orthonormé direct (O, u, v), on donne les points A(√3 − i), B(√3 + i) et C(2i).
   a. Représenter les points A, B et C.
   b. Montrer que le quadrilatère OABC est un losange.

**Exercice 37.** Soit un réel α de [0, π/2].

I.

1. Exprimer à l'aide de α, (e^(2iα) + 2e^(iα))² − (e^(2iα) − 2e^(iα))².
2. Résoudre dans ℂ l'équation z² − (e^(2iα) + 2e^(iα))z + 2 e^(3iα) = 0.

II. Le plan est muni d'un repère orthonormé direct (O, u, v). On désigne par A, B, A' et B' les points d'affixes respectives z_A = e^(2iα), z_B = 2 e^(iα), z_A' = i z_A et z_B' = −i z_B.

1. a. Mettre z_A' et z_B' sous la forme exponentielle.
   b. Placer les points A, B, A' et B' pour α = π/6.
2. Soit I le milieu du segment [A'B'].
   a. Montrer que z_A' / (z_B' − z_A) = −(1/2) i.
   b. En déduire que la médiane issue de O du triangle OA'B' est une hauteur issue de O du triangle OAB et que OI = (1/2) AB.

**Exercice 38.**

I.

1. Résoudre dans ℂ l'équation z² − 2 e^(iα) z + 2 e^(2iα) = 0, α un réel de [0, π].
2. Mettre les solutions sous la forme exponentielle.

II. Le plan est muni d'un repère orthonormé direct (O, u, v). On désigne par A et B les points d'affixes respectives z₁ = (1 − i) e^(iα) et z₂ = (1 + i) e^(iα).

1. a. Montrer que z₂/z₁ = i.
   b. En déduire que OAB est un triangle rectangle et isocèle en O.
2. a. Montrer que l'angle orienté (u, AB) ≡ α + π/2 [2π].
   b. Déterminer α pour que la droite (AB) soit parallèle à la droite d'équation y = x.
   c. Construire A et B pour la valeur de α trouvée.

**Exercice 39.** Soit un réel θ de [0, π/2] et l'équation (E) : i z² + 6 sin θ z − 9i = 0.

1. a. Résoudre dans ℂ l'équation (E).
   b. Ecrire sous la forme exponentielle les solutions de l'équation (E).
2. Le plan est muni d'un repère orthonormé direct (O, u, v). On désigne par A, M₁ et M₂ les points d'affixes respectives 3i, z₁ = 3(cos θ + i sin θ) et z₂ = 3(−cos θ + i sin θ).
   a. Vérifier que les points A, M₁ et M₂ sont sur un même cercle que l'on précisera.
   b. Déterminer la valeur de θ pour laquelle le quadrilatère OM₁AM₂ soit un losange.

3. Résoudre dans ℂ l'équation i z^4 + 3√3 z² − 9i = 0. Placer les points images des solutions.
