---
document_id: math_4eme_ma_002
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Isométries du plan
content_type: course
language: fr
source: Livre scolaire - Mathématiques, 4e année secondaire, section Mathématiques, Tome 2 (Ministère de l'Éducation/enseignement, Tunisie) - manuel officiel distribué publiquement
---

<!-- page: 36 -->

# Isométries du plan

Dans tout le chapitre, le plan est orienté dans le sens direct.

## I. Définition et propriétés

### I.1 Définition

<!-- type: exercise -->
**Activité 1.** Dans chacune des figures suivantes, déterminer une application f qui fixe B et qui envoie A sur C.

<!-- type: course -->
Soit f une application du plan dans lui-même et M₀ un point du plan. On dit que f fixe le point M₀ (ou M₀ est invariant par f) si f(M₀) = M₀.

<!-- type: exercise -->
**Activité 2.** On se propose de démontrer qu'une symétrie orthogonale conserve les distances. Soit Δ une droite du plan, O un point de Δ et i un vecteur unitaire de Δ. On munit le plan d'un repère orthonormé (O, i, j) et on désigne par S_Δ la symétrie orthogonale d'axe Δ. Soit M(x, y) et N(x₁, y₁) deux points du plan d'images respectives M' et N' par S_Δ.

1. Déterminer les coordonnées de M' et N'.
2. En déduire que M'N' = MN.

<!-- type: definition -->
**Définition.** Une application du plan dans lui-même est une isométrie si elle conserve les distances. C'est-à-dire, si M'N' = MN pour tous points M et N du plan d'images respectives M' et N'.

<!-- page: 37 -->

## I.1 Conséquences

<!-- type: course -->
- L'identité du plan, les translations, les symétries orthogonales et les rotations sont des isométries.
- Les images de deux points distincts du plan par une isométrie sont deux points distincts.

<!-- type: exercise -->
**Activité 3.** Le plan P est rapporté à un repère orthonormé direct (O, i, j). On considère l'application g du plan dans lui-même qui à tout point M d'affixe z associe le point M' d'affixe z' = ((−1 + i√3)/2) z.

1. Montrer que g est une isométrie.
2. Montrer que g est une rotation dont on précisera les éléments caractéristiques.

### I.2 Isométries et produit scalaire

<!-- type: definition -->
**Théorème.** Une application du plan dans lui-même est une isométrie, si et seulement si, elle conserve le produit scalaire. Une application f est une isométrie, si et seulement si, AB·AC = A'B'·A'C' pour tous points A, B et C d'images respectives A', B' et C'.

<!-- type: course -->
**Démonstration.** Soit f une isométrie et A, B et C trois points d'images respectives A', B' et C' par f. Montrons que AB·AC = A'B'·A'C'.

On sait que BC² = ‖AC − AB‖² = AC² + AB² − 2AB·AC et B'C'² = ‖A'C' − A'B'‖² = A'C'² + A'B'² − 2A'B'·A'C'.

L'application f étant une isométrie, il en résulte que AB·AC = A'B'·A'C'.

Réciproquement, soit f une application telle que AB·AC = A'B'·A'C' pour tous points A, B et C d'images respectives A', B' et C'. Montrons que f est une isométrie. Soit M et N deux points du plan d'images respectives M' et N' par f. On peut écrire MN² = MN·MN = M'N'·M'N' = M'N'². Il en résulte que MN = M'N'.

<!-- type: definition -->
**Corollaire.** Soit f une isométrie du plan. Si A, B et C sont trois points deux à deux distincts, d'images respectives A', B' et C', alors l'angle géométrique (BAC) = (B'A'C'). On dit qu'une isométrie conserve les mesures des angles géométriques.

<!-- page: 38 -->

<!-- type: course -->
**Démonstration.** Par définition du produit scalaire, on peut écrire AB·AC = AB·AC·cos(BAC) et A'B'·A'C' = A'B'·A'C'·cos(B'A'C'). L'application f étant une isométrie, on en déduit que cos(BAC) = cos(B'A'C'). Ce qui donne le résultat, puisque les mesures des angles géométriques appartiennent à [0, π].

<!-- type: definition -->
**Conséquence.** Les images par une isométrie de trois points non alignés sont trois points non alignés.

<!-- type: course -->
Le théorème ci-dessous découle du fait qu'une isométrie conserve les mesures des angles géométriques.

<!-- type: definition -->
**Théorème.** Soit f une isométrie, A, B et C trois points non alignés du plan et A', B' et C' leurs images respectives. Si le repère (A, AB, AC) est orthonormé alors le repère (A', A'B', A'C') est orthonormé. De plus, pour tout point M d'image M', AM = xAB + yAC avec x et y réels, implique que A'M' = xA'B' + yA'C'.

<!-- type: course -->
**Démonstration.** Soit (A, AB, AC) un repère orthonormé. L'application f étant une isométrie, il en résulte que ‖A'B'‖ = ‖AB‖ = 1, ‖A'C'‖ = ‖AC‖ = 1 et A'B'·A'C' = AB·AC = 0. Ce qui veut dire que le repère (A', A'B', A'C') est orthonormé.

Soit M un point tel que AM = xAB + yAC avec x, y réels. Les égalités x = AM·AB et y = AM·AC impliquent, par conservation du produit scalaire, que x = A'M'·A'B', y = A'M'·A'C' et A'M' = xA'B' + yA'C'.

### I.3 Isométrie réciproque

<!-- type: exercise -->
**Activité.** Soit f une isométrie du plan muni d'un repère orthonormé (A, AB, AC). On désigne par A', B' et C' les images respectives de A, B et C par f. Soit deux réels x et y et N le point tel que A'N = xA'B' + yA'C'.

<!-- page: 39 -->

Montrer que le point M de coordonnées (x, y) dans le repère (A, AB, AC) est l'unique point vérifiant f(M) = N. Soit g l'application qui à tout point N du plan associe son unique antécédent M par f. Vérifier que g(N) = M, si et seulement si, f(M) = N. En déduire que g est une isométrie.

<!-- type: course -->
Le théorème ci-dessous découle de l'activité précédente.

<!-- type: definition -->
**Théorème et définition.** Une isométrie f est une bijection du plan dans lui-même. L'application du plan dans lui-même qui à tout point N du plan associe son unique antécédent M par f est une isométrie appelée réciproque de f et notée f^(−1).

<!-- type: course -->
Il résulte du théorème ci-dessus que :

<!-- type: definition -->
- Pour toute isométrie f et tout point M, f(M) = N, si et seulement si, f^(−1)(N) = M.
- La réciproque d'une symétrie orthogonale est elle-même.
- La réciproque d'une symétrie centrale est elle-même.
- La réciproque d'une translation de vecteur u est la translation de vecteur −u.
- La réciproque d'une rotation de centre I et d'angle α est la rotation de centre I et d'angle −α.

### I.4 Isométries et configurations

<!-- type: exercise -->
**Activité 1.** Soit f une isométrie du plan muni d'un repère orthonormé (A, AB, AC). Soit P, Q, R, S, M et N des points du plan d'images respectives P', Q', R', S', M' et N'. Montrer que si MN = aPQ + bRS alors M'N' = aP'Q' + bR'S' où a et b sont réels.

<!-- type: definition -->
**Théorème.** Soit f une isométrie et A, B, C et D des points d'images respectives A', B', C' et D' par f. Si AB = α CD alors A'B' = α C'D', où α est un réel.

<!-- type: course -->
Nous résumons ci-dessous l'action d'une isométrie sur les configurations usuelles.

- Une isométrie conserve le barycentre de deux points. En particulier une isométrie conserve le milieu d'un segment.
- L'image d'une droite par une isométrie est une droite.
- L'image d'un segment par une isométrie est un segment qui lui est isométrique.
- Les images de deux droites parallèles par une isométrie sont deux droites parallèles (on dit qu'une isométrie conserve le parallélisme).
- L'image d'un parallélogramme par une isométrie est un parallélogramme.
- Les images de deux droites perpendiculaires par une isométrie sont deux droites perpendiculaires (on dit qu'une isométrie conserve l'orthogonalité).
- L'image d'un cercle par une isométrie est un cercle qui lui est isométrique.
- L'image par une isométrie de la tangente en un point M à un cercle est la tangente au cercle image, au point M' image de M (on dit qu'une isométrie conserve le contact).

<!-- page: 40 -->

<!-- type: exercise -->
**Activité 2.** Soit ABC un triangle rectangle en A tel que l'angle orienté (AB, AC) ≡ π/2 [2π], H le pied de la hauteur issue de A et D l'image de C par la rotation r de centre A et d'angle π/2. On désigne par O le pied de la hauteur issue de D dans le triangle DCB et par K le pied de la hauteur issue de A dans le triangle DAO.

1. Montrer que la rotation r transforme la droite (CB) en la droite (DO) et le triangle AHC en le triangle AKD.
2. En déduire que AHOK est un carré.

## II. Composition d'isométries

<!-- type: exercise -->
**Activité 1.** Soit f et g deux isométries et M et N deux points. On pose M' = f(M), N' = f(N), M'' = g(M') et N'' = g(N').

1. Comparer M'N' et MN puis M''N'' et M'N'.
2. En déduire que g∘f est une isométrie.
3. Montrer de la même manière que f∘g est une isométrie.

<!-- type: course -->
Soit f et g deux applications du plan dans lui-même. L'application du plan dans lui-même qui à tout point M du plan associe le point g(f(M)) est appelée la composée de f par g. On la note g∘f.

Si f, g et h sont trois applications du plan dans lui-même, (g∘f)∘h = g∘(f∘h) = g∘f∘h.

<!-- type: definition -->
**Théorème.** La composée de deux isométries est une isométrie.

<!-- type: exercise -->
**Activité 2 (Composée de deux symétries orthogonales d'axes sécants).** Soit D et D' deux droites sécantes en un point I et de vecteurs directeurs respectifs u et u'. On désigne par S_D et S_D' les symétries orthogonales d'axes respectifs D et D'. On considère un point M du plan distinct de I et on pose M' = S_D(M) et M'' = S_D'(M').

1. Montrer que IM'' = IM et que l'angle orienté (IM, IM'') ≡ 2(u, u') [2π].
2. Déduire que S_D'∘S_D est une rotation dont on précisera les éléments caractéristiques.
3. Identifier S_D∘S_D'.

<!-- page: 41 -->

<!-- type: definition -->
**Théorème.** La composée de deux symétries orthogonales d'axes sécants est une rotation. Plus précisément, si D et D' sont deux droites sécantes en un point I et de vecteurs directeurs respectifs u et u' et si S_D et S_D' sont les symétries orthogonales d'axes respectifs D et D', alors S_D'∘S_D est la rotation de centre I et d'angle α où α ≡ 2(u, u') [2π].

<!-- type: definition -->
**Conséquence.** La composée de deux symétries orthogonales d'axes perpendiculaires D et D' en I est la symétrie centrale de centre I, et dans ce cas S_D∘S_D' = S_D'∘S_D.

<!-- type: exercise -->
**Activité 3.** Dans la figure ci-contre, ABCD est un rectangle, E est le symétrique de B par rapport à A et F est le symétrique de B par rapport à C.

1. Identifier S_(DC)∘S_(DA).
2. Une droite Δ passant par B coupe (AD) en E' et (CD) en F'. Montrer que les droites (EE') et (FF') sont parallèles.

<!-- type: exercise -->
**Activité 4 (Composée de deux symétries orthogonales d'axes parallèles).** Soit D et D' deux droites parallèles, I un point de D et J son projeté orthogonal sur D'. On considère les symétries orthogonales S_D et S_D' d'axes respectifs D et D'.

1. Montrer que S_D'∘S_D = t_(2IJ).
2. Identifier S_D∘S_D'.

<!-- type: definition -->
**Théorème.** La composée de deux symétries orthogonales d'axes parallèles est une translation. Plus précisément, si D et D' sont deux droites parallèles et si S_D et S_D' sont les symétries orthogonales d'axes respectifs D et D', alors S_D'∘S_D est la translation de vecteur 2IJ, où I est un point de D et J est le projeté orthogonal de I sur D'.

<!-- page: 42 -->

<!-- type: exercise -->
**Activité 5.** Dans la figure ci-contre, ABCD est un parallélogramme et Δ₁ et Δ₂ sont les médiatrices respectives des segments [AB] et [CD]. On note P l'image de B par la symétrie orthogonale d'axe Δ₂ et Q l'image de D par la symétrie orthogonale d'axe Δ₁. Quelle est la nature du quadrilatère APCQ ?

<!-- type: definition -->
**Théorème.** Soit f et g deux isométries. g = f^(−1), si et seulement si, f∘g = Id, où Id désigne l'identité du plan.

<!-- type: course -->
**Démonstration.** Supposons que g est l'isométrie réciproque de f. Alors pour tout point M du plan, f(M) = N, si et seulement si, g(N) = M. Considérons un point M du plan et désignons par N son image par f. Alors f∘g(N) = f(M) = N.

Réciproquement, supposons que f∘g = Id. Montrons que g est l'isométrie réciproque de f. Si N est un point du plan tel que g(N) = M, alors d'après l'hypothèse f∘g(N) = f(M) = N. Le résultat en découle.

<!-- type: definition -->
**Propriété.** Si f et g sont deux isométries, alors (f∘g)^(−1) = g^(−1)∘f^(−1).

<!-- type: course -->
**Démonstration.** On sait, d'après le théorème précédent, que g∘g^(−1) = Id et f∘f^(−1) = Id. Il en résulte que (f∘g)∘(g^(−1)∘f^(−1)) = f∘f^(−1) = Id. Ce qui équivaut à (f∘g)^(−1) = g^(−1)∘f^(−1).

<!-- type: definition -->
**Propriété.** Soit f, g et h trois isométries. f = g, si et seulement si, h∘f = h∘g.

<!-- type: course -->
**Démonstration.** Pour tout point M, l'égalité f(M) = g(M) implique h(f(M)) = h(g(M)). Réciproquement, supposons que h∘f = h∘g. On déduit de l'implication précédente que h^(−1)∘(h∘f) = h^(−1)∘(h∘g). La propriété en découle.

<!-- type: exercise -->
**Activité 6.** Soit A, B et C trois points non alignés du plan. Donner les réciproques de chacune des isométries ci-dessous.

1. S_(AB)∘S_(AC).
2. S_(AC)∘S_(AB).
3. t_(AB)∘S_(AC)∘t_(−BC).

<!-- page: 43 -->

<!-- type: course -->
**Exercice résolu.** Soit D₁, D₂ et D₃ trois droites distinctes et S₁, S₂ et S₃ les symétries orthogonales d'axes respectifs D₁, D₂ et D₃. Montrer que la composée S₁∘S₂∘S₃ est une symétrie orthogonale, si et seulement si, les droites D₁, D₂ et D₃ sont parallèles ou concourantes.

**Solution.** Supposons que S₁∘S₂∘S₃ est une symétrie orthogonale d'axe D. L'égalité S₁∘S₂∘S₃ = S_D est équivalente à S₁∘S₂ = S_D∘S₃ (*).

Si D₁ est parallèle à D₂ alors S₁∘S₂ est une translation de vecteur u orthogonal à D₁ et D₂. Il en résulte que D est parallèle à D₃ et u est orthogonal à D₃. On en déduit que les droites D₁, D₂, D₃ et D sont parallèles.

Si D₁ et D₂ se coupent en un point I, alors S₁∘S₂ est une rotation de centre I. Il en résulte que D₃ et D se coupent en I et alors les droites D₁, D₂, D₃ et D sont concourantes en I. L'équivalence (*) permet de conclure.

## III. Isométries et points fixes

### III.1 Isométries ayant des points fixes

<!-- type: exercise -->
**Activité 1.** Soit f une isométrie du plan, différente de l'identité du plan et A un point non fixe de f d'image A'. Montrer que si M est un point fixe de f, alors M appartient à la médiatrice du segment [AA'].

<!-- type: definition -->
**Théorème.** Soit f une isométrie différente de l'identité, A un point non fixe de f et A' son image. Alors les points fixes de f, s'ils existent, se trouvent sur la médiatrice du segment [AA'].

<!-- type: definition -->
**Théorème.** Une isométrie fixe trois points non alignés, si et seulement si, c'est l'identité du plan.

<!-- type: course -->
**Démonstration.** Soit f une isométrie et A, B et C trois points non alignés. Pour tout point M du plan, on peut écrire AM = xAB + yAC. Ce qui implique que A'M' = xA'B' + yA'C', où A', B', C' et M' sont les images respectives par f des points A, B, C et M. Si les points A, B et C sont invariants par f, alors AM' = xAB + yAC. Il en résulte que M = M'.

<!-- page: 44 -->

<!-- type: definition -->
**Conséquence.** Si deux isométries f et g coïncident sur trois points non alignés, alors elles coïncident partout dans le plan. On dit qu'une isométrie est déterminée par la donnée de trois points non alignés et leurs images.

<!-- type: definition -->
**Théorème.** Si une isométrie fixe deux points distincts A et B, alors elle fixe tous les points de la droite (AB).

<!-- type: course -->
**Démonstration.** Soit f une isométrie qui fixe deux points distincts A et B. Pour tout M de (AB), il existe un réel x tel que AM = xAB. Il en résulte que l'image M' de M par f vérifie l'égalité AM' = xAB. On en déduit que M = M'.

<!-- type: definition -->
**Théorème.** Si une isométrie f fixe deux points distincts A et B et si elle est différente de l'identité, alors f est la symétrie orthogonale d'axe (AB).

<!-- type: course -->
**Démonstration.** Soit f une isométrie, différente de l'identité, qui fixe deux points distincts A et B. Soit M un point du plan et M' son image par f. Si M est sur la droite (AB) alors M = M'. Si M n'est pas sur la droite (AB), alors M' et M sont distincts car une isométrie différente de l'identité ne fixe pas trois points non alignés. De plus, les points A et B sont sur la médiatrice de [MM']. On en déduit que f est la symétrie orthogonale d'axe (AB).

<!-- type: exercise -->
**Activité 2.** Soit ABCD un carré direct. On désigne par S la symétrie orthogonale d'axe la médiatrice de [BC] et par T la translation de vecteur BC.

1. a. Déterminer les images par S∘T des points A, B et D. b. Identifier S∘T.
2. a. Déterminer les images par T∘S des points C, D et A. b. Identifier T∘S.
3. En déduire la nature de S∘T∘T∘S.

<!-- type: definition -->
**Théorème.** Si une isométrie f fixe un unique point I alors f est une rotation de centre I et d'angle non nul.

<!-- page: 45 -->

<!-- type: course -->
**Démonstration.** Soit f une isométrie qui fixe un unique point I du plan et soit A un point distinct de I, d'image A' par f. On note D la médiatrice de [AA'] et S_D la symétrie orthogonale d'axe D. Puisque I est un point fixe par f alors I appartient à D. Les égalités (S_D∘f)(I) = I et (S_D∘f)(A) = A impliquent que S_D∘f est soit l'identité du plan, soit la symétrie orthogonale S_(IA). L'isométrie S_D∘f ne peut pas être l'identité du plan car f serait égale à S_D et fixerait plus d'un point. Par conséquent, S_D∘f = S_(IA) et par suite f = S_D∘S_(IA). On en déduit que f est une rotation de centre I.

<!-- type: exercise -->
**Activité 3.** Le plan P est rapporté à un repère orthonormé direct (O, i, j). Soit f l'application de P dans P, qui à tout point M(x, y) associe le point M'(x', y') tel que :

x' = (√2/2)x − (√2/2)y ; y' = (√2/2)x + (√2/2)y.

1. Montrer que f est une isométrie de P.
2. a. Montrer que f admet un seul point invariant que l'on déterminera. b. En déduire que f est une rotation dont on précisera les éléments caractéristiques.

### III.2 Isométries sans point fixe

<!-- type: exercise -->
**Activité 1.** Soit Δ une droite du plan de vecteur directeur u. On note S_Δ la symétrie orthogonale d'axe Δ et on pose f = t_u∘S_Δ.

1. a. Construire l'image d'un point A de Δ. b. Déterminer f(Δ).
2. Montrer que f n'a pas de point fixe.

<!-- type: definition -->
**Théorème.** Soit O un point du plan. Alors toute isométrie f se décompose de manière unique en la composée d'une translation et d'une isométrie g qui fixe O.

<!-- type: course -->
**Démonstration.** Soit O' l'image de O par f et u = OO'. Alors l'isométrie g = t_(−u)∘f fixe le point O. Le théorème en découle.

<!-- page: 46 -->

<!-- type: exercise -->
**Activité 2.** Soit O et O' deux points distincts du plan, g une rotation de centre O d'angle non nul α. On considère l'isométrie f = t_(OO')∘g. Soit N un point du plan tel que l'angle orienté (OO', ON) ≡ π/2 − α/2 [2π], N' son image par g. L'image de la droite (ON) par la translation t_(OO') coupe (ON') en un point B. En considérant l'antécédent de B par g, montrer que f possède un point fixe.

<!-- type: exercise -->
**Activité 3.** Soit f une isométrie, O un point d'image O' distincte de O. On suppose qu'il existe une symétrie orthogonale d'axe Δ passant par O telle que f = t_(OO')∘S_Δ.

1. On suppose que OO' est orthogonal à Δ et on désigne par M un point de la médiatrice du segment [OO']. Montrer que f fixe M et ne fixe pas O puis identifier f.
2. Montrer que si OO' est un vecteur directeur de Δ alors f n'admet pas de point fixe.
3. On suppose que OO' n'est ni orthogonal à Δ, ni directeur de Δ. Soit C et D les points tels que OO' = OC + OD, OC directeur de Δ et OD orthogonal à Δ. Montrer que f = t_(OC)∘S_Δ', où le vecteur OC est directeur de Δ'. En déduire que f est sans point fixe.

<!-- type: course -->
Les activités précédentes nous permettent d'énoncer le théorème ci-dessous.

<!-- type: definition -->
**Théorème.** Une isométrie qui n'a aucun point fixe est soit une translation de vecteur non nul, soit la composée d'une translation de vecteur non nul u et d'une symétrie orthogonale d'axe Δ tel que u est directeur de Δ.

<!-- type: course -->
**Démonstration.** Soit f une isométrie sans point fixe, O un point du plan et O' son image par f. On sait qu'il existe une isométrie g qui fixe O et telle que f = t_(OO')∘g. D'après l'activité 2, g ne peut pas être une rotation car f admettrait un point fixe. Par suite, g est soit l'identité soit une symétrie orthogonale. Si g est l'identité alors f est une translation. Si g est une symétrie orthogonale d'axe Δ alors d'après l'activité 3, f est la composée d'une translation de vecteur non nul u et d'une symétrie orthogonale d'axe Δ tel que u est directeur de Δ.

<!-- page: 47 -->

<!-- type: definition -->
**Définition.** La composée d'une translation de vecteur non nul u et d'une symétrie orthogonale d'axe Δ tel que u est directeur de Δ est appelée symétrie glissante.

## IV. Décomposition d'une isométrie

<!-- type: definition -->
**Théorème.** Toute isométrie se décompose en au plus trois symétries orthogonales.

<!-- type: course -->
**Démonstration.** Soit f une isométrie. Soit A, B et C trois points non alignés, d'images respectives A', B' et C' par f.

On note f_(M,N) = l'identité, si M = N ; f_(M,N) = la symétrie orthogonale transformant M en N, si M distinct de N.

Montrons que f est la composée d'au plus trois symétries orthogonales. Notons B₁ et C₁ les images respectives de B et C par f_(A,A') et C₂ l'image de C₁ par f_(B₁,B'). Alors f_(C₂,C') transforme C₂ en C'. De plus, f_(C₂,C')∘f_(B₁,B')∘f_(A,A') transforme les points A, B et C en les points A', B' et C'. Il en résulte que f_(C₂,C')∘f_(B₁,B')∘f_(A,A') = f.

### IV.1 Décomposition d'une rotation

<!-- type: exercise -->
**Activité 1.** Dans la figure ci-contre, ABC est un triangle direct isocèle rectangle en A et Δ est la médiatrice du segment [BC]. On désigne par r la rotation de centre A qui transforme B en C et par S_Δ et S_(AB) les symétries orthogonales d'axes respectifs Δ et (AB). Montrer que r = S_Δ∘S_(AB).

<!-- type: exercise -->
**Activité 2.** Soit r une rotation de centre I et d'angle θ et D une droite passant par I et de vecteur directeur u. On désigne par D' la droite passant par I et de vecteur directeur u' tel que 2(u, u') ≡ θ [2π]. Montrer que r = S_D'∘S_D.

<!-- page: 48 -->

<!-- type: definition -->
**Théorème.** Toute rotation est la composée de deux symétries orthogonales d'axes sécants. Plus précisément, soit r une rotation de centre I et d'angle θ et D une droite quelconque passant par I et de vecteur directeur u. Alors r = S_D'∘S_D, où D' est la droite passant par I et de vecteur directeur u' tel que 2(u, u') ≡ θ [2π].

<!-- type: definition -->
**Conséquence.** Soit S_I la symétrie centrale de centre I et D une droite passant par I. Alors S_I = S_D'∘S_D = S_D∘S_D', où D' est la droite perpendiculaire à D en I.

<!-- type: exercise -->
**Activité 3.** Dans la figure ci-contre, ABC est un triangle équilatéral direct et A' est le milieu du segment [BC]. On note r la rotation de centre A et d'angle π/3 et S_(AB) la symétrie orthogonale d'axe (AB).

1. Déterminer la droite Δ telle que r = S_Δ∘S_(AB), où S_Δ désigne la symétrie orthogonale d'axe Δ.
2. Soit S_A' la symétrie centrale de centre A'. Décomposer S_A' en deux symétries orthogonales.

### IV.2 Décomposition d'une translation

<!-- type: exercise -->
**Activité 1.** Soit t_u une translation de vecteur non nul u, D une droite quelconque de direction orthogonale à celle de u et H un point de D. Montrer que t_u = S_D'∘S_D, où D' est la droite parallèle à D et passant par le point K tel que HK = (1/2)u.

<!-- page: 49 -->

<!-- type: definition -->
**Théorème.** Toute translation est la composée de deux symétries orthogonales d'axes parallèles. Plus précisément, soit t_u la translation de vecteur non nul u, D une droite quelconque de direction orthogonale à celle de u et H un point de D. Alors t_u = S_D'∘S_D, où D' est la droite parallèle à D et passant par le point K tel que HK = (1/2)u.

<!-- type: exercise -->
**Activité 2.** Soit un rectangle ABCD. Identifier t_(2AB)∘S_(AD).

<!-- type: exercise -->
**Activité 3.** Montrer que toute symétrie glissante f se décompose sous la forme f = S_D∘S_D'∘S_D'', avec D∩D' = ∅ et D'' est perpendiculaire à D.

<!-- type: course -->
Le tableau ci-dessous donne une classification des isométries suivant leur décomposition en symétries orthogonales et leurs points fixes.

| Nature de l'isométrie | Décomposition en symétries orthogonales | Ensemble des points fixes |
|---|---|---|
| Identité du plan. | S_D∘S_D | Tout le plan. |
| Symétrie orthogonale d'axe D. | S_D | La droite D. |
| Rotation de centre I et d'angle θ, θ ≠ k2π ; k ∈ ℤ | S_D∘S_D' (D∩D' = {I}) | {I}. |
| Translation de vecteur non nul. | S_D∘S_D' (D∩D' = ∅) | L'ensemble vide. |
| Symétrie glissante d'axe D et de vecteur u. | S_D∘S_D'∘S_D'' (D∩D' = ∅) et D perpendiculaire à D'' | L'ensemble vide. |

<!-- page: 50 -->

# QCM

<!-- type: exercise -->
**QCM.** Cocher la réponse exacte.

1. Soit ABCD un carré direct et soit r la rotation de centre A et d'angle π/2. Alors r est égale à :
   a. S_(AB)∘S_(AC).
   b. S_(AB)∘S_(AD).
   c. S_(AC)∘S_(AB).
2. Soit (AB) une droite et C un point de (AB). Alors S_(AB)∘S_(AC) est :
   a. la symétrie centrale S_A.
   b. l'identité.
   c. la symétrie orthogonale S_(BC).
3. Soit A, B et C trois points non alignés et f une isométrie qui fixe les deux points A et B et ne fixe pas le point C. Alors f est :
   a. l'identité.
   b. la symétrie orthogonale S_(AB).
   c. la translation t_(AB).
4. Soit A et B deux points distincts et O le milieu de [AB]. Soit f une isométrie qui envoie A sur B et B sur A. Alors f(O) est :
   a. A.
   b. O.
   c. B.
5. Soit ABC un triangle équilatéral et f une isométrie qui envoie A sur B, B sur C et C sur A. Alors f∘f∘f est :
   a. une symétrie orthogonale S_(AC).
   b. la translation t_(AB).
   c. l'identité.

# VRAI - FAUX

<!-- type: exercise -->
**VRAI - FAUX.** Répondre par vrai ou faux en justifiant la réponse.

1. La seule isométrie fixant trois points distincts est l'identité.
2. Les symétries glissantes sont les seules isométries sans point fixe.
3. Si une isométrie laisse globalement invariante une droite, alors elle est soit une symétrie orthogonale, soit une translation.
4. La composée de deux symétries orthogonales distinctes est soit une translation soit une rotation.
5. Soit ABC un triangle isocèle rectangle en A et direct. Soit f une isométrie qui fixe A et envoie B sur C. Alors f est soit la rotation de centre A et d'angle π/2, soit la symétrie orthogonale d'axe la médiatrice de [BC].

<!-- page: 51 -->

# Exercices et problèmes

<!-- type: exercise -->
**Exercice 1.** Soit A et A' deux points distincts du plan et Δ la médiatrice du segment [AA']. Soit B un point du plan n'appartenant pas à Δ tel que (AB) et Δ ne sont pas parallèles. Construire à la règle seulement le symétrique B' de B par rapport à la droite Δ.

<!-- type: exercise -->
**Exercice 2.** Dans la figure ci-dessous, les demi-droites [Ox) et [Oy) sont sécantes. A et B sont deux points fixes de [Ox). Soit M et N deux points variables sur [Oy) tels que MN = AB et N ∈ [My). On note P le milieu du segment [AM] et Q le milieu du segment [BN]. Montrer que Q est l'image de P par une translation qui ne dépend pas des points M et N.

<!-- type: exercise -->
**Exercice 3.** On considère un triangle ABC de centre de gravité G. On désigne par A', B' et C' les images respectives de A, B et C par une isométrie qui fixe G. Montrer que AA' + BB' + CC' = 0 (somme de vecteurs).

<!-- type: exercise -->
**Exercice 4.** Soit S₁ et S₂ deux symétries orthogonales d'axes respectifs Δ₁ et Δ₂.

1. Discuter, suivant la position relative de Δ₁ et Δ₂, la nature de S₁∘S₂.
2. À quelle condition sur Δ₁ et Δ₂, a-t-on S₁∘S₂ = S₂∘S₁ ?

<!-- type: exercise -->
**Exercice 5.** On considère deux cercles isométriques 𝔈 et 𝔈' sécants en deux points A et B. Soit deux points I et J tels que le quadrilatère IAJB est un losange et I est à l'intérieur du cercle 𝔈. On suppose que les droites (IA) et (IB) recoupent le cercle 𝔈' respectivement en P et Q et que les droites (JA) et (JB) recoupent le cercle 𝔈 respectivement en M et N. Montrer que le quadrilatère MNQP est un rectangle.

<!-- type: exercise -->
**Exercice 6.** Soit ABCD un parallélogramme de centre O. On note I, J, K et L les milieux respectifs des segments [AB], [BC], [CD] et [DA].

1. Déterminer les images de A, I et L par la symétrie centrale S₁ de centre O.
2. Construire les points E et F, images respectives de J et K par la symétrie centrale S₂ de centre C.
3. Déterminer les images de A, I et L par S₂∘S₁, puis par la translation de vecteur AC. Conclure.

<!-- type: exercise -->
**Exercice 7.** On considère un triangle ABC rectangle en A, on note A' le symétrique de A par rapport à la médiatrice du segment [BC] et A'' le symétrique de A' par rapport à la droite (BC). Montrer que le quadrilatère ACA''B est un rectangle.

<!-- type: exercise -->
**Exercice 8.** On considère un triangle ABC isocèle en A. On désigne par D l'image de B par la symétrie orthogonale d'axe (AC) et par I le milieu du segment [BC]. Soit f une isométrie laissant A invariant et transformant B et C respectivement en C et D. On pose g = S_(AC)∘f.

1. Déterminer g(A), g(B), g(C) et g(I).
2. Montrer que g est une symétrie orthogonale.

<!-- type: exercise -->
**Exercice 9.** Soit ABC un triangle équilatéral direct. On désigne par I le milieu de [AC] et par Δ la droite passant par B et parallèle à (AC). Soit J un point de [BA] distinct de B. La droite passant par J et parallèle à (AC) coupe [BC] en un point K.

1. Caractériser S_(AC)∘S_Δ et S_(KJ)∘S_(AC).
2. Identifier f = S_(AC)∘S_Δ∘S_(KJ)∘S_(AC).
3. Déterminer la position du point J sur [BA] pour que f soit la translation de vecteur BI.

<!-- page: 52 -->

<!-- type: exercise -->
**Exercice 10.** Le plan P est rapporté à un repère orthonormé direct (O, i, j). On considère l'application f de P dans P qui à tout point M d'affixe le nombre complexe z associe le point M' d'affixe le nombre complexe z' = iz − 1 − i. Montrer que f est une isométrie et la caractériser.

<!-- type: exercise -->
**Exercice 11.** Le plan P est rapporté à un repère orthonormé direct (O, i, j). Soit f l'application de P dans P, qui à tout point M(x, y) associe le point M'(x', y') tel que :

x' = 1 − √2 + (1/√2)x + (1/√2)y ; y' = 1 + (1/√2)x − (1/√2)y.

1. Montrer que f est une isométrie.
2. a. Déterminer l'ensemble des points fixes de f. b. En déduire que f est symétrie orthogonale.

<!-- type: exercise -->
**Exercice 12.** Dans le plan orienté P, on considère l'application f de P dans P qui à tout point M d'affixe le nombre complexe z associe le point M' d'affixe le nombre complexe z' = iz.

1. Montrer que f est une isométrie.
2. Déterminer l'ensemble des points invariants par f.
3. En déduire la nature de f.

<!-- type: exercise -->
**Exercice 13.** Soit OAB un triangle équilatéral direct. On désigne par Δ la droite perpendiculaire à (OA) en O, par D la médiatrice de [AB] et par S₁, S₂, S₃ et S₄ les symétries orthogonales d'axes respectifs (OA), (OB), Δ et D. On note f = S₃∘S₂∘S₁.

1. Montrer que f = S₃∘R où R est une rotation que l'on caractérisera.
2. Montrer que R = S₃∘S₄.
3. Identifier f.

<!-- type: exercise -->
**Exercice 14.** Soit A et B deux points distincts du plan et f une isométrie qui laisse globalement invariant le segment [AB].

1. Montrer que f fixe le milieu de [AB].
2. En déduire toutes les isométries qui laissent globalement invariant le segment [AB].

<!-- type: exercise -->
**Exercice 15.** Soit 𝔈 un cercle de centre O.

1. Donner la nature des isométries qui laissent 𝔈 globalement invariant.
2. Soit A et B deux points distincts de 𝔈. Déterminer les isométries qui laissent globalement invariants le cercle 𝔈 et le triangle OAB.

<!-- type: exercise -->
**Exercice 16.** Soit ABC un triangle équilatéral direct et f une isométrie qui envoie A sur B et B sur C.

1. Montrer que si f n'admet pas de points invariants, alors f est une symétrie glissante.
2. On suppose que f admet un point invariant. a. Montrer que f n'est pas une symétrie orthogonale. b. Identifier alors f.

<!-- type: exercise -->
**Exercice 17.** Soit Δ et Δ' deux droites strictement parallèles, A est un point de Δ et B est un point de Δ'. Déterminer toutes les isométries qui transforment Δ en Δ' et A en B.

<!-- type: exercise -->
**Exercice 18.** Soit ABCD un carré direct de centre I. On se propose de déterminer les isométries du plan qui laissent globalement invariant le carré ABCD. Soit f une isométrie du plan qui laisse globalement invariant le carré ABCD.

1. a. Montrer que f(I) = I. b. En déduire que f est soit l'identité du plan, soit une rotation de centre I et d'angle non nul et soit une symétrie orthogonale d'axe passant par I.
2. On suppose que f n'est pas une symétrie orthogonale. Montrer que : Si f(A) = A, alors f est l'identité. Si f(A) = B, alors f est la rotation de centre I d'angle π/2. Si f(A) = C, alors f est la symétrie centrale de centre I. Si f(A) = D, alors f est la rotation de centre I et d'angle −π/2.
3. On suppose que f est une symétrie orthogonale. Montrer que : Si f(A) = A, alors f est la symétrie orthogonale d'axe (IA).

<!-- page: 53 -->

Si f(A) = B, alors f est la symétrie orthogonale d'axe Δ₂ où Δ₂ désigne la médiatrice du segment [DC]. Si f(A) = C, alors f est la symétrie orthogonale d'axe (IB). Si f(A) = D, alors f est la symétrie orthogonale d'axe Δ₁ où Δ₁ désigne la médiatrice du segment [CB].

4. Conclure.

<!-- type: exercise -->
**Exercice 19.** On considère un triangle ABC équilatéral direct de centre G. On désigne par r la rotation de centre G et d'angle π/3 et par A', B' et C' les images respectives de A, B et C par r.

1. Quel est le centre de gravité du triangle A'B'C' ?
2. Soit f une isométrie transformant {A, B, C} en {A', B', C'}. a. Montrer que f(G) = G. b. Déterminer toutes les isométries transformant {A, B, C} en {A', B', C'}.

<!-- type: exercise -->
**Exercice 20.** Soit ABC un triangle équilatéral direct.

1. Déterminer toutes les isométries f qui laissent globalement invariant le triangle ABC.
2. Soit D = S_(AC)(B). On se propose de déterminer toutes les isométries f qui transforment ABC en ACD. a. On pose g = S_(AC)∘f. Déterminer l'image par g du triangle ABC. b. En déduire toutes les isométries f.

<!-- type: exercise -->
**Exercice 21.** Soit ABC un triangle rectangle en A et direct. Soit H le projeté orthogonal de A sur (BC).

1. Déterminer la droite Δ tel que S_(CA)∘S_(AB) = S_Δ∘S_(AH).
2. Donner la nature de S_(BC)∘S_(CA)∘S_(AB).

<!-- type: exercise -->
**Exercice 22.** Soit ABC un triangle équilatéral direct et 𝔈 le cercle circonscrit à ABC. La médiatrice de [BC] recoupe le cercle 𝔈 en D et la droite (BD) coupe (AC) en E.

1. a. Montrer que le triangle BCE est isocèle en C. b. Montrer que (DC) est la médiatrice de [AE].
2. On note f = S_(BD)∘S_(DC) et g = S_(AC)∘S_(AB). a. Caractériser les isométries f et g. b. Déterminer les droites Δ et Δ' telles que f = S_Δ∘S_(AD) et g = S_(AD)∘S_Δ'. c. Montrer que Δ et Δ' sont parallèles puis identifier f∘g.
