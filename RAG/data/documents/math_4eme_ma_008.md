---
document_id: math_4eme_ma_008
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Identité de Bezout
content_type: course
language: fr
source: Livre scolaire - Mathématiques, 4e année secondaire, section Mathématiques, Tome 2 (Ministère de l'Éducation/enseignement, Tunisie) - manuel officiel distribué publiquement
---
<!-- page: 162 -->

162 Identité de Bezout Dans ce chapitre on désigne par ` l’ensemble des entiers naturels et par ] l’ensemble des entiers. I. PGCD de deux entiers Activité 1 Déterminer a b  dans chacun des cas suivants 1. a 465

; b 225

, 2. a 196

; b 116

, 3. a 144

; b 388

. On rappelle que si a et b sont deux entiers naturels non nuls alors leur plus grand commun diviseur est l’entier naturel a b  , tel que a b  divise a et b et tout diviseur commun à a et b divise a b  . Activité 2 Dans cette activité nous nous proposons d'utiliser l'algorithme d'Euclide pour déterminer le plus grand diviseur commun de deux entiers naturels a et b Le plus grand diviseur commun de deux entiers naturels a et b est le dernier reste non nul dans la succession des divisions euclidiennes de l'algorith me d'Euclide de a et b. 1. Recherche de 4851 616  . En écrivant les divisions successives de l'al gorithme d'Euclide pour les entiers 4851 et 616, on obtient 4851 616 7 539

u

; 616 539 1 77

u ; 539 77 7 0

u . Le dernier reste non nul étant 77 , on en déduit que 4851 616 77 

. 2. Utiliser l'algorithme d'Euclide pour déterminer a b  dans chacun des cas ci-dessous. 1. 19625 1155  . 2. 17680 4960  . 3. 30870 15750  . Activité 3 On se propose de déterminer le plus grand commun diviseur de deux entiers en utilisant la calculatrice. 1. Recherche de 2003 365  En tapant ' ' ab 2003 365 = c , la calculatrice affiche 5 178 365 . Le résultat affiché signifie que 2003 178 5 365 365

et que la fraction 178 365 est irréductible, ou encore que 365 178 1  . La division euclidienne 2003 365 5 178

u nous permet d'affirmer que 2003 365 365 178 1 

 .

<!-- page: 163 -->

163 Identité de Bezout 2. Recherche de 4010 365  . En tapant ' ' ab 4010 365 = c , la calculatrice affiche 10 72 73. Ce qui signifie que 4010 72 10 365 73

et que la fraction 72 73 est irréductible, ou encore que72 73 1 

La division euclidienne 4010 365 10 360

u

et les propriétés du plus grand commun diviseur nous permettent d'affirmer que 4010 365 365 360 5(73 72) 5 





. 3. Utiliser la calculatrice pour déterminer a b  dans chacun des cas ci-dessous. a 8623

et b 1155

; a 19662

et b 865

; a = 4830 et b = 3122. Activité 4 Soit a et b deux entiers naturels non nuls et d un entier non nul, diviseur commun de 7a 9b

et 3a 4b

. 1. Montrer que d est un diviseur commun de 21a 27b

et 21a 28b

. En déduire que d divise b. 2. Montrer que d divise a. 3. Montrer que

7a 9b 3a 4b a b



 . Activité 5 Soit a et b deux entiers non nuls et d un entier. Montrer que d divise a et b, si et seulement si, d divise a et b . Théorème et définition Si a et b sont deux entiers non nuls, alors il existe un unique entier naturel d qui vérifie les deux conditions suivantes: 1. d divise a et d divise b, 2. Si un entier k divise a et b alors il divise d. L’entier d défini plus haut est noté a b  et appelé le plus grand commun diviseur de a et b. Conséquences Pour tous entiers a et b non nuls, a b 0  ! . Pour tous entiers a et b non nuls, a b a b 

 . Activité 6 En utilisant la calculatrice, déterminer a b  dans chacun des cas ci-dessous. 1. a 462

; b 1155

. 2. a 196625

; b 654

. L'égalité a b a b 

 nous permet de généraliser les propriétés du plus grand commun diviseur de deux entiers naturels non nuls à celles du plus grand commun diviseur de deux entiers non nuls.

<!-- page: 164 -->

164 Identité de Bezout Propriétés Soit a et b deux entiers non nuls. < Si b divise a alors a b b . 

< Si b ne divise pas a et si r est le reste modulo b de a alors a b b r 

 . < a b b a 

 . < Pour tout entier non nul k,

ka kb k a b . 

 <

a b c a b c  

  . Activité 7 1. A l'aide de la calculatrice, déterminer le quotient et le reste de 2921

par 18. 2. Existe-t-il deux entiers a et b tels que a b 2921

et a b 18 

? II. Entiers premiers entre eux Définition Deux entiers non nuls a et b sont dits premiers entre eux, si a b 1  . Activité 1 Soit n un entier et d un entier naturel non nul. 1. Montrer que si d est un diviseur commun de n 1 et n 9

, alors d divise 8. 2. En déduire que si n est pair alors

n +1 et n +9 sont premiers entre eux. Théorème Soit a et b deux entiers non nuls. Alors il existe un unique couple d’entiers

a ,b c c tel que a (a b)a , b (a b)b et a b 1 c c c c



  . Démonstration Soit a et b deux entiers non nuls. Posons d a b

 . L’entier d étant un diviseur commun à a et b, il existe deux entiers non nuls a et b c c tels Que a da et b db c c

. On en déduit qued a b da db d(a b ) c c c c





 . Ce qui prouve quea b 1 c c  . L’unicité est évidente. Activité 2 Déterminer dans chaque cas les entiers premiers entre eux a et b c c tels que

a a b .a et b a b .b c c



 . 1. a 60 et b 84

2. a 77 et b 150

3. a 240 et b 150

.

<!-- page: 165 -->

165 Identité de Bezout Exercice résolu 1 Pour tout entier n, on pose a 2n 5 et b n 3

. 1. Montrer que tout diviseur commun de a et b est un diviseur de 11. 2. En déduire, suivant les valeurs de n, la valeur de a b  . 3. Application Déterminera b  lorsque 3120 3120 a 2 12 5 et b 12 3

u

. Solution 1. Si un entier non nul d divise a et b, alors il divise a 2b 11

. 2. D’après la question précédente, tout diviseur commun de a et b est un élément de l’ensemble ^ ` 11 , 1 , 1 , 11

. Il en résulte que a b 11 ou a b 1 

 . Par ailleurs,

n 3 0 mod 11

{ , si et seulement si,

n 3 mod 11 { et dans ce cas

2n 5 0 mod 11

{ . Il en résulte quea b 11 

, si et seulement si,

n 3 mod 11 { . Par suite, a b 1, si et seulement si, n n 'est pas congru à 3 mod ulo 11. 

3. Les entiers 3120 3120 a 2 12 5 et b 12 3

u

sont de la forme 2n 5 et n 3

, avec 3120 n 12

. Les relations

12 1 mod 11 { et

3120 12 1 mod 11 { impliquent que

3120 3120 2 12 5 12 3 1 u



. Activité 3 Pour tout entier n, on posea n 2 et b 3n 1

. Déterminer a b  , suivant les valeurs de n. Activité 4 Soit a et b deux entiers non nuls tels que a b 1  et soit c un entier non nul. 1. Justifier que ac bc c 

. 2. Montrer que si a divise bc alors a divise c. L’activité précédente permet d’énoncer le théorème ci-dessous. Lemme de Gauss Soit a, b et c trois entiers non nuls. Si a b 1  et a divise bc alors a divise c. Activité 5 On se propose de résoudre dans u ] ] l’équation E : 43x 71y 0

. 1. Montrer que si

a ,b est solution de E alors 43 divise b et 71 divise a. 2. En déduire l’ensemble des solutions de E .

<!-- page: 166 -->

166 Identité de Bezout Activité 6 Résoudre dans u ] ] les équations ci-dessous. a. 13x 9y 0. b. 20x 17y. c. 21x 35y 0.

Exercice résolu 2 Soit a et b deux entiers naturels non nuls tels que a b 1  . 1. Montrer que a b et ab

sont premiers entre eux. 2. Montrer que 2 2 a b et a ab b

sont soit premiers entre eux, soit divisibles par 3. Solution 1. Soit p un diviseur premier deab . L'égalité a b 1  implique l'une des deux possibilités suivantes: ou bien p divise a et ne divise pas b et dans ce cas p ne divise pas a b

, ou bien p divise b et ne divise pas a et dans ce cas p ne divise pas a b

. Il en résulte que a b et ab

n'ont aucun diviseur pr emier commun et alors

a b ab=1

 . 2. On peut écrire

2 2 2 (a b) a ab b = 3ab

. Il en résulte que tout diviseur d commun à 2 2 a b et a ab b

divise nécessairement 3ab. Les entiers a b et ab

étant premiers entre eux, on déduit du lemme de Gauss que d divise 3 , c'est-à-dire d =1 ou d =3. Ce qui prouve le résultat. Exercice résolu 3 On se propose de résoudre dans u ] ] l'équation (E):

2x 12y mod 10 { . 1. Montrer que si

2x 12y mod 10 { alors

x y 0 mod 5

{ . 2. a. Résoudre dans u ] ] l'équation

x y mod 5 { . b. En déduire les solutions de

2x 12y mod 10 { . Solution 1. a. Un couple (x, y) est solution de

2x 12y mod 10 { , si et seulement si, 2x 12y

est divisible par 10, ou encore, si et seulement si, 2(x 6y)

est divisible par 10. Il en résulte que 5 divise x 6y

et par suite 5 divise x y

car x 6y x y 5y

. On en déduit que si

2x 12y mod 10 { alors

x y mod 5 { . 2. a Les solutions de l'équation

x y mod 5 { sont tous les couples de la forme (x,x 5k) tels que x et k

  ] ] . b. D'après ce qui précède si un couple (x, y) est solution de

2x 12y mod 10 { alors ce couple est de la forme (x,x 5k) avec x et k

  ] ] .

<!-- page: 167 -->

167 Identité de Bezout Montrons que tout couple de cette forme est solution de (E). Si (x, y) (x,x 5k) avec x et k

  ] ] alors 12(x 5k) 12x 60k 2x 10(6k x)

. Ce qui prouve que

2x 12y mod 10 { . En conclusion

2x 12y mod 10 { , si et seulement si, (x, y) (x,x 5k) avec x et k

  ] ] . Activité 7 1. Donner une condition nécessaire et suffisante pour qu’un entier soit divisible par 187. 2. Un entier qui est divisible par 2 et par 28 est-il nécessairement divisible par 56 ? 3. Soit a et b deux entiers naturels non nuls et premiers entre eux. Montrer que si a divise n et b divise n alors ab divise n. L’activité précédente nous permet d’énoncer le théorème ci-dessous. Théorème Soit a et b deux entiers naturels non nuls et n un entier. Si a b 1  ,

n 0 mod a { et

n 0 mod b { alors

n 0 mod ab { . Activité 8 Déterminer les restes respectifs modulo 13 et modulo 17 de 129286. En déduire le reste modulo 221 de 129286. III. PPCM de deux entiers Activité 1 Soit a et b deux entiers non nuls, d a b

 et a et b c c les entiers tels que a b 1 c c  , a da et b db c c

. On pose m d a bc c

1. Vérifier que m est un multiple commun à a et à b et que tout multiple commun à a et b est un multiple de m. 2. En déduire que m est le plus petit multiple commun strictement positif de a et b. Théorème et définition Pour tous entiers a et b non nuls il existe un unique entier m strictement positif qui vérifie les deux conditions suivantes. < m est un multiple de a et b, < tout multiple commun de a et b est un multiple de m. L’entier m ainsi défini est le plus petit commun multiple de a et b et est noté a b  . Conséquences < Pour tous entiers a et b non nuls, a b a b 

 . < Pour tous entiers a et b non nuls,

a b a b ab  u 

.

<!-- page: 168 -->

168 Identité de Bezout Cette dernière conséquence nous permet d’affirmer que les propriétés du plus petit commun multiple de deux entiers non nuls sont les mêmes que celles du plus petit commun multiple de deux entiers naturels non nuls. Propriétés Soit a et b deux entiers non nuls. < Si b divise a alors a b a . 

< Pour tout entier non nul k, ka kb k (a b). 

 < a b b a 

 . <

a b c a b c  

  . Activité 2 Déterminer a b  dans chacun des cas. En déduire a b  . 1. a 495 et b 2541

2. a 24 et b 56

3. a 123 et b 82

. Activité 3 Résoudre dans u ] ] les systèmes ci-dessous. ab 1176, S: a b 84.

­ ® 

¯ ab 168, S : a b 24.

­ c ® 

¯ Activité 4 Soit a un entier non nul et a] l’ensemble de tous les multiples de a. 1. Déterminer 2] . 2. Déterminer les ensembles E, F et G définis par ^ ` E n 6 et n 31



] , ^ ` F n 5 et n 31



] et G l’intersection de E et F. Activité 5

1. a. Montrer que si a 0 mod 8 et a 0 mod 12 , alors a 0 mod 24 { { { . b. La réciproque est-elle vraie ? 2. Déterminer les entiers a vérifiant

a 1 mod 8 , a 1 mod 12 , a 225. ­ { ° { ® ° d ¯ IV. Inverses modulo b Activité 1 1. Soit u un entier. a. Déterminer à l’aide d’un tableau de congruence les restes possibles de 6u modulo 9. b. Existe-t-il un entier u tel que

6u 1 mod 9 { ? 2. Déterminer un entier u tel que

m 34 1 7 u od { .

<!-- page: 169 -->

169 Identité de Bezout Théorème Soit a et b deux entiers naturels non nuls tels que b 2 t et a b 1  . Alors il existe un unique entier non nul u appartenant à ^ ` 0, 1, ...,b 1

tel que

au 1 mod b { . On dit que u est un inverse de a modulo b. Démonstration Soit m et n deux entiers. La congruence

ma na mod b { est équivalente à

(m n)a 0 mod b

{ . Les entiers a et b étant premiers entre eux, il résulte de ce qui précède que

ma na mod b { , si et seulement si, b divise m n

(*). Soit i et j deux entiers tels que 0 i j b 1 d d . Remarquons que b ne divise pas j i car 0 j i b

. On déduit alors de (*) que ia et ja ont nécessairement des restes modulo b distincts. Par suite, à chaque élément ia de

^ ` E 0,a,..., b 1 a

, il correspond un unique reste appartenant à ^ ` 0,1, 2, ...,b 1

. Ce qui équivaut à dire que la relation

au 1 mod b { possède une unique solution dans ^ ` 0,1,...,b 1

. Exercice résolu 4 1. Déterminer un inverse de 4 modulo 13. 2. Résoudre dans ] l'équation

4x 1 mod 13 { . 3. En déduire les solutions dans ] de

43x 1 mod 13 { . Solution 1. Les entiers 4 et 13 étant premiers entre eux, il existe un entier u0 appartenant à ^ ` 0, 1, 2, ...,12 tel que

0 4u 1 mod 13 { . La division euclidienne 40 3 13 1 u implique 0 u 10

. 2. Si x est solution de

4x 1 mod 13 { alors

0 4x 4u mod 13 { , ou encore,

4(x 10) 0 mod 13

{ . Ce qui implique nécessairement que

x 10 mod 13 { car 13 ne divise pas 4. Réciproquement, si

x 10 mod 13 { alors

4x 1 mod 13 { . Les solutions cherchées sont tous les entiers x 10 13k, k

]. 3. On vérifie facilement que

43 4 mod 13 { et par suite

43x 4x mod 13 { . Il en résulte que

43x 1 mod 13 { , si et seulement si,

4x 1 mod 13 { . Les solutions dans ] de l'équation

43x 1 mod 13 { sont donc les entiers x 10 13k, k

].

<!-- page: 170 -->

170 Identité de Bezout V. Identité de Bezout Activité 1 1. a. Déterminer un inverse de 25 modulo 13. b. En déduire deux entiers u et v tels que 25u 13v 1

. 2. Déterminer deux entiers u et v tels que 27u 10v 1

. 3. Déterminer, dans chacun des cas suivants, deux entiers u et v tels que au bv 1

. a 9 et b 14

; a 9 et b 8.

Théorème (Identité de Bezout) Deux entiers non nuls a et b sont premiers entre eux, si et seulement si, il existe deux entiers u et v tels que au bv 1

. Démonstration Nous démontrerons d’abord le théorème dans le cas où a et b sont des entiers naturels premiers entre eux. Puis nous déduirons le cas général. Supposons que a et b sont deux entiers naturels premiers entre eux et montrons l’existence de deux entiers u et v tels que au bv 1

. Si b 1 alors a 0 b 1 1 u

u et les entiers 0 et 1 conviennent. Si b 1 ! alors la relation

au 1 mod b { possède une unique solution w dans ^ ` 0, 1, 2, ...,b 1

et alors il existe un entier k tel que aw bk 1

. Il suffit donc de prendre u w et v k

. Réciproquement, supposons qu’il existe deux entiers u et v tels que au bv 1

. Alors tout diviseur d commun à a et b divise nécessairement 1, ce qui veut dire que a b 1  . Le théorème est ainsi démontré lorsque a et b sont deux entiers naturels non nuls. Supposons à présent que a est un entier négatif non nul et b un entier naturel non nul. On sait d’après ce qui précède qu’il existe deux entiers u et v tels que

a u bv 1

. On en déduit que

a u bv 1

. Ce qui démontre le théorème. Les autres cas se traitent de la même manière. Corollaire Soit a et b deux entiers non nuls et d a b

 . Alors il existe deux entiers u et v tels que au bv d

. Démonstration On sait qu'il existe deux entiers a et b c ctels que a (a b)a , b (a b)b et a b 1 c c c c



  . D'après le théorème de Bezout il existe deux entiers u et v tels que a u b v 1 c c

et alors da u db v au bv d c c

. Exercice résolu 5 1. Montrer que les entiers 22826 et 537 sont premiers entre eux. 2. Trouver deux entiers u et v tels que 22826u 537v 1

.

<!-- page: 171 -->

171 Identité de Bezout Solution 1. En tapant ' ' 22826 ab/c 537 la calculatrice affiche 42 272 537 . On en déduit que 22826 537 272 537 1. 



2. Nous donnons un procédé pour trouver deux entiers u et v tels que 22826u 537v 1

. On écrit les divisions euclidiennes successives jusqu'à obtenir un reste nul. Les résultats sont consignés dans le tableau suivant. r 22826 537 272 265 7 6 1 0 q 42 1 1 37 1 6 On complète alors le tableau ci-dessous en respectant la loi q D E qE D J G qG J q 42 1 1 37 1 6 0 1 42 1 0 42 u

1 42 1 43 u

1 43 42 85 u

37 85 43 3188 u

1 3188 85 3273 u

6 3273 3188 22826 u

1 0 42 0 1 1 u 1 1 0 1 u

1 1 1 2 u 37 2 1 75 u

1 75 2 77 u

6 77 75 537 u

Les deux dernières colonnes donnent 22826 77 3273 537 1 u

u . Activité 2 1. Vérifier que 11413 et 191 sont premiers entre eux. 2. Utiliser le procédé de l’exercice précédent pour déterminer deux entiers u et v tels que 11413u 191v 1

. VI. Exemples d’équations de la forme ax+by =c ; a , b et c entiers Activité 1 Soit a, b et c trois entiers et d a b

 . On considère dans u ] ] l'équation E :ax by c

. 1. Montrer que si d ne divise pas c alors E n'admet pas de solution dans u ] ] . 2. Montrer que si d divise c alors E admet des solutions dans u ] ] . Théorème Soit a, b et c trois entiers et d a b

 . L'équation ax by c

admet des solutions dans u ] ] , si et seulement si, d divise c. Activité 2 On se propose de résoudre dans u ] ] l’équation E : 2x 3y 1

. 1. Déterminer une solution particulière

0 0 x , y de E . 2. a. Vérifier que

x, y est solution de E , si et seulement si,

0 0 2 x x 3 y y 0

. b. En déduire les solutions de E .

<!-- page: 172 -->

172 Identité de Bezout 3. Soit l'équation

1 E : 2x 3y 5

. Montrer que

0 0 5x ,5y est une solution particulière de

1 E . Donner alors les solutions de

1 E . Activité 3 1. Résoudre dans u ] ] l’équation7x 11y 1

. 2. En déduire l’ensemble des solutions de chacune des équations suivantes. a. 7x 11y 2.

b. 7x 11y 5.

c. 7x 11y 5.

Activité 4 Résoudre dans u ] ] l’équation 35x 14y 7

. Activité 5 On considère dans u ] ] l’équation E : 46x 115y a

où a est un entier non nul. 1. a. Déterminer 46 115  . b. Déterminer une condition nécessaire et suffisante sur a pour que l’équation E admette au moins une solution. 2. Résoudre dans u ] ] l’équation E , dans chacun des cas ci-dessous. a 23. a 230. a 15.

< < < Activité 6 1. Résoudre dans u ] ] les équations 5x 3y 1

et 5x 3y 1

. 2. En déduire les solutions entières de l’équation 2 2 25x 9y 7

. Problème résolu Dans le plan muni d’un repère orthonormé

O,i, j G G , on considère les points

A 7,12 , B 7,0 et C 0,12 . 1. a. Déterminer les points de coordonnées entières qui appartiennent à la droite

OA . b. En déduire les points de coordonnées entières qui appartiennent au segment > @ OA . 2. a. Résoudre dans u ] ] les équations 12x 7y 1 et 12x 7y 1.

b. Montrer qu’à l’intérieur du rectangle ABOC. il existe deux points I et J de coordonnées entières et tels que la distance de chacun d’entre eux à la droite soit minimale. 3. Vérifier que le quadrilatère OIAJ est un parallélogramme et calculer son aire. Solution 1. On vérifie facilement que la droite (OA) est d’équation 12x 7y 0.

Déterminer les points M de coordonnées entières appartenant à (OA), revient à résoudre dans u ] ] , l’équation 12x 7y 0.

<!-- page: 173 -->

173 Identité de Bezout Les entiers 12 et 7 étant premiers entre eux, il en résulte que

x, y est une solution de de 12x 7y

si et seulement si, 7 divise x, 12 divise y et 12 y x 7

. On en déduit que les solutions entières de12y 7x 0

sont les couples

7k,12k , k ] . b. Un point

M x, y de

OA appartient à > @ OA , si et seulement si, 0 x 7 d d et 0 y 12 d d . Les seuls couples

7k, 12k , k ] qui vérifient les conditions précédentes sont

0,0 et

7,12 , donc les seuls points de > @ OA de coordonnées entières sont les points O et A. 2. a. L’égalité 12 3 7 5 1 u u implique que

3,5 est une solution particulière de 12x 7y 1

. On en déduit que 12x 7y 1

, si et seulement si, 12(x 3) 7(y 5)

. Par suite, les solutions entières de 12x 7y 1

sont les couples

7k 3, 12k 5

, k ] . L’équation 12x 7y 1

est équivalente à l’équation 12( x) 7( y) 1

. Par suite, les solutions entières de 12x 7y 1

sont les couples

7k 3, 12k 5 c c

,kc] . b. Soit

M x, y un point à coordonnées entières intérieur au triangle ABOC. Remarquons que x est un entier strictement compris entre 0 et 7 et y est un entier strictement compris entre 0 et 12. De plus la distance de M(x,y) à la droite

OA est minimale, si et seulement si,

12x 7y 12x 7y d M, OA 144 49 193

est minimale. L’entier non nul 12x 7y

est minimum lorsqu’il vaut 1. On en déduit qu’un

M x, y à coordonnées entières et intérieur au rectangle ABOC se trouve à une distance minimale de

OA , si et seulement si,12x 7y 1

ou 12x 7y 1

, avec les conditions 0 x 7 d d et 0 y 12 d d . Il résulte alors des questions précédentes que seuls les points

I 3,5 et

J 4,7 répondent à la question. 3. Le milieu S de > @ OA a pour coordonnées 7 ,6 2 § · ¨ ¸ © ¹ . On vérifie facilement que S est le milieu de > @ IJ . Par suite, le quadrilatère OIAJ est un parallélogramme. De plus, l’aire A du parallélogramme OIAJ est le double de l’aire c A du triangle AOI. On en déduit que

1 2 OA d I, OA 193 1 193 c

u

u

A A .

<!-- page: 174 -->

174 Identité de Bezout QCM Cocher la réponse exacte. 1. L’entier 5 est un inverse modulo 6 de 5. 5.

1. 2. Soit p un nombre premier. 2 p p 1. 

2 p p p. 

2 2 p p p . 

3. L’ensemble des solutions entières de l’équation 11x 5y 1

est

^ ` 1 5k, 2 11k , k .

]

^ ` 1 11k, 2 5k , k .

]

^ ` 2 5k, 1 11k , k .

] 4. L’ensemble des solutions entières de l’équation 13x 17y 0

est

^ ` 17k, 13k , k . ]

^ ` 13k, 17k , k . ]

^ ` 17 13k, 13 17k , k .

] VRAI - FAUX Répondre par vrai ou faux en justifiant la réponse. 1. Soit n un entier.

n 0 mod 143 { , si et seulement si,

n 0 mod 13 { et

n 0 mod 11 { . 2. Pour tous entiers a et b, a.

3a 3b 3 a b



 . b. Si a b a b 

 alors a b

. 3. L’équation 25x 80y 3

admet des solutions entières. 4. Tout entier admet un inverse modulo 14. 5. Pour tout entier n 2 t ,

n 1

est son propre inverse modulo n.

<!-- page: 175 -->

175 Identité de Bezout 1 Déterminer a b  dans chacun des cas ci-dessous. 1. a 558 et b 1235

. 2. a 924 et b 990

. 3. a 999 et b 888

. 4. a 1890 et b 5250

. 2 Calculer a b  et a b  dans chacun des cas ci-dessous. 1. a 588 et b 1235

. 2. a 51 et b 255

. 3. a 2n 1 et b n

, où n est un entier non nul. 3 Trouver les valeurs possibles de l’entier a sachant que a 180 36 et a 360 

. 4 Trouver tous les couples

a ,b d’entiers non nuls tels que a b 19 et ab 2166 

. 5 Montrer qu’il n’existe aucun couple

a ,b d’entiers tels que 2 2 a b 19 et a b 490 

. 6 1. Montrer que

5 5 2 1 mod 11 et 2 1 mod 31 { { . 2. En déduire les congruences

340 340 2 1 mod 11 et 2 1 mod 31 { { . 3. Montrer que 341 divise 340 2 1 . 7 La décomposition de 561 en facteurs premiers est 561 3 11 17 u u . Soit a un entier premier avec 561. 1. Vérifier que a est premier avec chacun des entiers 3, 11 et 17. 2. Montrer que a. 3 divise 2 a 1 . b. 11 divise 10 a 1 . c. 17 divise 16 a 1 . 3. En déduire les congruences

560 560 560 a 1 mod 3 , a 1 mod11 et a 1 mod17 . { { { 3. Montrer que 561 divise 560 a 1 . 8 Soit a , b et d trois entiers non nuls tels que a b d 

. 1. Montrer que si un entier n divise 4a 5b et 5a 2b

alors n divise 17a et 17b. 2. En déduire que

4a 5b 5a 2b d



ou

4a 5b 5a 2b 17d



. 9 Soit a, b et n trois entiers non nuls. 1. Montrer que si d divise a et b alors d divise

a bn et a b n 1 .

2. Montrer que si d divise

a bn et a b n 1

alors d divise a et b. 3. En déduire que

a b a bn a b n 1 



. 10 1. a. Donner une solution particulière de

5x 1 mod 17 { . b. En déduire les solutions dans ] de

5x 1 mod 17 { . c. Donner les solutions dans ] de

345x 1 mod 17 { . 2. a. Résoudre dans ]

5x 2 mod 17 { . b. Donner les solutions dans ] de

430x 2 mod 17 { . 11 Résoudre dans ] a.

17x 1 mod 33 { . b.

17x 9 mod 33 { . 12 Déterminer l’ensemble des couples (x, y) tels que

12x 30y mod 15 { .

<!-- page: 176 -->

176 Identité de Bezout 13 Déterminer l’ensemble des couples (x, y) tels que

11x 99y mod 77 { . 14 1. Vérifier que 2015 2007 1  . 2. Déterminer deux entiers a et b tels que 2007a 2015b 1.

15 1. Vérifier que 391 323 17 

. 2. Déterminer deux entiers a et b tels que 391a 323b 17

. 3. En déduire une solution de 391a 323b 204.

16 1. Résoudre dans u ] ] l’équation 97x 11y 1

. 2. Soit l’équation (E):97x 77y 7.

a. Donner une solution particulière de E . b. Résoudre dans u ] ] l’équation E . 17 On pose u 2 3

. 1. a. Montrer par récurrence que, pour tout entier naturel n 1 t , n n n u a b 3

, où n n a et b sont des entiers naturels. b. Exprimer n 1 a et n 1 b à l’aide de n n a et b . 2. a. Montrer que 2 2 n n n n 1 n 1 n a 3b 1 et a b a b 1

. b. En déduire que n n n 1 n n 1 n a b a a b b 1







. 18 Résoudre dans u ] ] chacune des équations suivantes. a. 7x 14y 5. b. 5x 10y 10. c. 29x 58y 3.

19 Résoudre dans u ] ] chacune des équations suivantes. 2 2 a. (4x 3y 5)(4x 3y 1) 0. b. x 9y 2.

20 1. Résoudre dans u ] ] l’équation

E :13x 8y 1

. 2. On considère les triplets (x, y,z) de u u ] ] ] vérifiant le système 5x y 2z 1, S: 8x 9y 2z 0.

­ ®

¯ Montrer que si (x, y,z) est solution de S alors (x, y) est solution de E . Résoudre S dans u u ] ] ] . 21 1. Déterminer deux entiers u et v tels que 9u 11v 1

. 2. Soit a, b et x trois entiers. Montrer que si

x a et mo x b d 9 mod 11 { { , alors

x 45b 44 mo a d 99 {

. 3. Résoudre dans ] le système

mod 9 mod 11 x 6 , x 8 . ­ { °® { °¯ 22 Pour tout entier n, on considère les nombres a 2n 3 et b 3n 1.

1. Quelles sont les valeurs possibles de a b  ? 2. a. Vérifier que pour tout n, le couple

a,b est solution de l’équation E :3x 2y 7.

b. Résoudre dans u ] ] l’équation E . 3. Déterminer l’ensemble des entiers n tels que a b 7. 

23 Soit p, q et u trois nombres premiers. On pose n = pqu et on suppose que p–1, q–1 et u–1 divisent n–1. Soit a un entier premier avec n. 1. Montrer que p 1 a 1 (mod p) { , q 1 a 1 (mod q) { . et u 1 a 1 (mod u) { . En déduire les congruences n 1 a 1 (mod p) { , n 1 a 1 (mod q) { . et n 1 a 1 (mod u) { . 2. Montrer que n 1 a 1 (mod n) { . 3. Décomposer 561 en produit de facteurs premiers et montrer que 560 224 1 (mod 561) { . 4. Montrer que 1728 561 1 (mod 1729) { .

<!-- page: 177 -->

177 Identité de Bezout 24 1. Soit a et b des entiers naturels non nuls tels que

a b ab p



, où p est nombre premier. a. Montrer que p est un diviseur commun de a et b. b. Montrer que a b p 

. 2. On désigne par a et b deux entiers naturels tels que a b d . a. Résoudre le système a b 5 a b 170 

­ ® 

¯ . b. En déduire les solutions du système

a b ab 5 a b 170 ­



® 

¯ . 25 On désigne par x et y deux entiers naturels non nuls tels que x y

. Soit S l’ensemble des couples

x, y tels que x y y x 

. 1. Calculer 363 484  . Le couple

363, 484 appartient-il à S ? 2. Soit n un entier naturel non nul. Le couple

n, n 1

appartient-il à S ? 3. a. Montrer que

x, y appartient à S, si et seulement si, il existe un entier naturel k non nul tel que

x k y x et y k 1 y x

. b. En déduire que pour tout couple

x, y de S,

x y k k 1 y x 

. 4. a. Déterminer l’ensemble des entiers naturels diviseurs de 228. b. En déduire l’ensemble des couples

x, y de S tels que x y 228 

. 26 Le plan est rapporté à un repère orthonormé direct (O, u, v) G G . On considère l’application f qui au point M d’affixe z associe le point Mc d’affixe zc tel que 3 4i 1 2i z z 5 5

c

. 1. a. Déterminer l’ensemble des points invariants par f. b. Quelle est la nature de f ? 2. a. Déterminer l’ensemble D des points M d’affixe z tels que zc soit réel. b. Résoudre dans u ] ] l’équation 4x 3y 2

. c. En déduire les points de D dont les coordonnées sont entières. 3. On considère les points M d’affixe z 1 iy, où y

] . Déterminer les entiers y tels que

Re z et Im z c c soient entiers. 27 Soit a et b deux entiers. 1. Montrer que si

2 2 2 a ab b 1

alors a et b sont premiers entre eux. On considère l’équation

2 2 2 E : x xy y 1

. 2. Déterminer les solutions entières de E telles que x y

. 3. Soit

p,q une solution de E . a . Montrer que

q,p q

est une solution de E . b. En déduire que

p q , p 2q

est une solution de E . c. Donner six solutions de E . 28 Le but de l’exercice est déterminer l'ensemble E des triplets (x, y,z) de

u u ` ` ` tels que 2 2 2 x y z

. 1. Montrer que pour tout couple (a, b) d'entiers naturels non nuls tels que a >b, 2 2 2 2 (a b , 2ab,a b )

est un élément de E. 2. Soit (x, y,z) un élément de E tel que x y 1  . a. Montrer que x z 1  et y z 1  . b. Montrer que x et y ne sont pas tous les deux pairs. c. Montrer que l'équation 2 a 2 (mod 4) { ne possède pas de solution entière. d. Montrer que si x et y sont tous les deux impairs alors 2 2 x y 2 (mod 4)

{ . En déduire que x et y ne peuvent pas être tous les deux impairs. e. On suppose que x est impair et y est pair. Montrer que z est impair et que z+x et z-x sont pairs. En déduire qu'il existe deux entiers strictement positifs p et q, premiers entre eux, tels que x p q

, z p q

et 2 y 4pq

et p et q sont des carrés parfaits. 3. En déduire l'ensemble des éléments de E. 4. Donner tous les triplets de E tels que z 18. d

<!-- page: 178 -->

178 Identité de Bezout 29 On considère les dix caractères A, B, C, D, E, F, G, H, I et J auxquels on associe dans l’ordre les entiers de 1 à 10. On note ^ ` 1, 2,3,...,10 : . On appelle message tout mot ayant un sens ou non formé avec ces dix caractères. Soit a un entier compris entre 1 et 10. On désigne par f l’application qui à tout élément i de : associe le reste de ia modulo 11. 1. On suppose que a = 5. a. Coder à l’aide de f le message « BAC » en utilisant la grille de chiffrement ci-dessous Message B A C i 2 1 3

f i 3 Code C b. Coder à l’aide de f le message « FADE ». Peut-on déchiffrer avec certitude le message codé ? 2. On suppose que a = 2. Donner la grille de chiffrement de f. Peut-on déchiffrer avec certitude un message codé? 3. On se propose de déterminer les valeurs possibles de l’entier a pour que l’application f permette de chiffrer et de déchiffrer avec certitude tous les messages. a. Soit i et ic deux entiers compris entre 1 et 9 tels que i ic

. Montrer que

i i a a mod 11 c { équivaut à

i i a 1 mod 11 c { . b. En déduire que f permet de chiffrer et de déchiffrer avec certitude tous les messages , si et seulement si, ia n’est pas congru à 1 modulo 11 pour tout ^ ` i 1, 2,3,...,9  . c. On suppose que k est le plus petit entier de : tel que

k a 1 mod 11 { . Montrer que k est un diviseur de 10. d. Conclure. 30 On considère la suite de Fibonacci n n 0 (F ) t définie par 0 1 n+2 n+1 n F 0 ; F 1 et F F F , n 0.

t 1. Calculer les termes de cette suite jusqu’à 10 F . 2. Montrer que pour tout entier non nul n, 2 n n+1 n 1 n F F F ( 1)

. 3. En déduire que pour tout entier non nul n, n n 1 F F 1

 . 4 . Soit n un entier non nul. Montrer par récurrence sur l’entier m que n+m m n 1 m 1 n F =F F F F

. 5. En déduire que m n m m n F F F F 

 . 31 Pour tout entier naturel n, on note n M le nombre d’entier naturels inférieurs à n et premiers avec n. On pose 1 1 M

. 1. Vérifier que

7 6 et 8 4 M

M

. 2. Montrer que n n 1 M d . Soit k un entier naturel non nul, p et q deux nombres premiers et a un entier non divisible par p et q. 3. a. Montrer que p p 1 M

. b. Montrer que

(p) a 1 mod p M { . 4. a. Montrer que

pq p q M M M . b. Montrer que

(pq) a 1 mod pq M { . c. En déduire les congruences ci-dessous

1536 10 1 mod 1649 { ;

10200 10430 1 mod 10403 { . 5. a. Montrer que

k k k 1 p p p M

. b. Déterminer

125 , 256 et 1331 M M M . 6. a. Montrer que

k 1 p k 1 up 1 mod p

{ (On pourra utiliser que tout entier non nul n divise j n C , j 0 et j n z z ). b. Montrer que

k (p ) k a 1 mod p M { . En déduire les congruences ci-dessous

100 17 1 mod 125 { ;

128 17 1 mod 256 { .
