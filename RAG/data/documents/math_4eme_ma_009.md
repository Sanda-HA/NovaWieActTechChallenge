---
document_id: math_4eme_ma_009
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Probabilités
content_type: course
language: fr
source: Livre scolaire - Mathématiques, 4e année secondaire, section Mathématiques, Tome 2 (Ministère de l'Éducation, Tunisie) - manuel officiel distribué publiquement
---
<!-- page: 180 -->
## A. Probabilité sur un ensemble fini — I. Expériences aléatoires

<!-- type: exercise -->
**Activité 1.** On désigne par E l'ensemble des entiers naturels pairs inférieurs ou égaux à 500. On note A l'ensemble des entiers de E qui sont multiples de 10, B l'ensemble des entiers de E qui sont multiples de 6, C l'ensemble des entiers de E qui sont multiples de 15.

1. Dénombrer E, A, B et C.
2. Déterminer et dénombrer chacun des ensembles A ∩ B, A ∩ C, B ∩ C, A ∪ B, A ∪ C, B ∪ C et (A ∪ B) ∪ C.

**Activité 2.** 1. Combien y a-t-il d'anagrammes du mot CHOIX ? 2. Combien y a-t-il d'anagrammes du mot POSSIBLE ? 3. Combien y a-t-il d'anagrammes du mot BACCALAUREAT ?

**Activité 3.** Une urne contient trois boules numérotées 1, 2 et 3. On effectue p tirages, en tirant les boules une à une et en remettant chaque fois la boule tirée dans l'urne.

1. On note A₃ l'ensemble des tirages qui n'amènent pas le numéro 3. Déterminer le cardinal de A₃.
2. On note A₂,₃ l'ensemble des tirages qui n'amènent ni le numéro 2 ni le numéro 3. Déterminer le cardinal de A₂,₃.
3. On note B l'ensemble des tirages qui n'amènent pas en même temps les numéros 1, 2 et 3. Déterminer le cardinal de B.

**Activité 4.** Dans une librairie douze titres de revues différentes sont disponibles. Trois clients commandent chacun une revue.

1. Combien y a-t-il de commandes possibles ?
2. Combien y a-t-il de commandes possibles si on suppose qu'aucun titre n'est choisi deux fois ?
3. Combien y a-t-il de commandes possibles si on suppose que les clients commandent la même revue ?
4. Combien y a-t-il de commandes si exactement deux clients choisissent le même titre ?

<!-- page: 181 -->
## Dénombrement : p-uplets, arrangements et combinaisons

<!-- type: definition -->
**Définition.** Soit E = {a₁, a₂, …, aₙ} un ensemble à n éléments et p un entier naturel non nul.

- Le nombre des p-uplets d'éléments de E est l'entier n^p.
- Le nombre de n-uplets d'éléments de E deux à deux distincts est l'entier n! (factorielle n).
- Si 1 ≤ p ≤ n alors :
  - le nombre des p-uplets d'éléments de E deux à deux distincts est l'entier A_n^p = n! / (n − p)! (nombre d'arrangements),
  - le nombre de parties à p éléments de E est l'entier C_n^p = n! / ((n − p)! × p!) (nombre de combinaisons).

L'entier C_n^p est aussi noté binôme de n et p (n sur p), et on convient que C_n^0 = 1.

<!-- type: exercise -->
**Activité 5.** 1. a. Déterminer le nombre de parties d'un ensemble à quatre éléments. b. Déterminer le nombre de parties d'un ensemble à cinq éléments.

2. Soit E un ensemble à n éléments (n ≥ 1).
 a. Vérifier que Σ (k = 0 à n) C_n^k = 2^n.
 b. En déduire le nombre de parties de l'ensemble E.

**Activité 6.** Soit un entier n ≥ 2 et un entier 2 ≤ p ≤ n. On considère un ensemble E de cardinal n et a, b deux éléments de E.

1. a. Déterminer le nombre des parties à p éléments contenant a et b. b. Déterminer le nombre des parties à p éléments contenant a ou bien b. c. Déterminer le nombre des parties à p éléments ne contenant ni a ni b.
2. En déduire que C_n^p = C_(n−2)^(p−2) + 2 × C_(n−2)^(p−1) + C_(n−2)^p.

<!-- page: 182 -->
## II. Définition d'une probabilité sur un ensemble fini

<!-- type: definition -->
**Définition.** Une expérience aléatoire est une expérience dont le résultat est soumis au hasard et est donc imprévisible. L'ensemble E des issues d'une expérience aléatoire est appelé univers. Les éléments de E sont appelés événements élémentaires. Une partie A de E est appelée événement.

<!-- type: exercise -->
**Activité 1.** Une expérience consiste à lancer une pièce de monnaie trois fois de suite. On note à chaque fois le côté exposé (P pour pile et F pour face).

1. Dénombrer les issues de cette expérience.
2. Déterminer le cardinal de chacun des événements ci-dessous. A : « La face pile apparaît une seule fois », B : « Obtenir P pour la première fois au deuxième lancer ».
3. Déterminer le cardinal de A ∩ B et de A ∪ B.

<!-- type: definition -->
**Définition.** Soit E l'univers d'une expérience aléatoire et P(E) l'ensemble des événements de E. On appelle probabilité sur E toute application p, de P(E) dans [0, 1], vérifiant les conditions ci-dessous :

- l'image p(E) de E est égale à 1 ;
- l'image p(∅) de l'ensemble vide est égale à 0 ;
- l'image p(A) d'un événement A est la somme des images des événements élémentaires de A, c'est-à-dire p(A) = Σ p({aᵢ}) (somme sur les éléments aᵢ de A).

**Vocabulaire.** Le triplet (E, P(E), p) est appelé espace probabilisé fini. L'événement E est appelé événement certain. L'événement vide est appelé événement impossible. L'événement contraire d'un événement A est noté A̅. Deux événements sont dits incompatibles si leur intersection est vide.

<!-- type: exercise -->
**Activité 2.** On lance un dé cubique dont les faces sont numérotées de 1 à 6.

1. On suppose que la probabilité d'apparition de 6 est le triple de la probabilité d'apparition de chacun des nombres 1, 2, 3, 4 et 5. Déterminer la probabilité de chaque événement élémentaire.
2. Déterminer la probabilité de chacun des événements ci-dessous. A : « obtenir un nombre pair », B : « obtenir un nombre impair inférieur ou égal à 3 », C : « obtenir un nombre pair strictement supérieur à 3 », D : « obtenir un multiple de 3 ou un nombre pair ».

<!-- page: 183 -->
## Propriétés des probabilités

<!-- type: definition -->
**Propriété.** Soit (E, P(E), p) un espace probabilisé et A, B deux événements de E.

- p(A̅) = 1 − p(A).
- p(A ∪ B) = p(A) + p(B) − p(A ∩ B).
- Si A ∩ B = ∅, alors p(A ∪ B) = p(A) + p(B).
- Si A₁, A₂, …, A_k sont des événements deux à deux incompatibles, alors p(A₁ ∪ A₂ ∪ … ∪ A_k) = p(A₁) + p(A₂) + … + p(A_k).

<!-- type: exercise -->
**Exercice résolu 1.** Un appareil, fabriqué en très grande série, peut présenter deux sortes de défauts désignés par D₁ et D₂. Dans un lot de 1000 appareils, on constate que 60 appareils ont le défaut D₁, 50 appareils ont le défaut D₂ et 20 appareils ont les deux défauts. Un client achète un appareil (on admet que son achat a été fait au hasard). Déterminer les probabilités des événements suivants :

A : « L'appareil a les deux défauts » ; B : « L'appareil a au moins un défaut » ; C : « L'appareil n'a pas de défaut » ; D₁̅ : « L'appareil a le défaut D₁ et n'a pas le défaut D₂ » ; D₂̅ : « L'appareil a le défaut D₂ et n'a pas le défaut D₁ » ; D : « L'appareil a un seul défaut ».

**Solution.** On désigne par D₁ : « L'appareil a le défaut D₁ » et par D₂ : « L'appareil a le défaut D₂ ». Il en résulte que A = D₁ ∩ D₂. D'après les données, 20 appareils parmi 1000 ont les deux défauts D₁ et D₂. On en déduit que p(A) = 20/1000 = 0.02.

L'événement B est la réunion des événements D₁ et D₂. On en déduit que p(B) = p(D₁) + p(D₂) − p(D₁ ∩ D₂) = 60/1000 + 50/1000 − 20/1000 = 0.09.

L'événement C est l'événement contraire de B. Par suite, p(C) = 1 − p(B) = 0.91.

On vérifie facilement que D₁ = (D₁ ∩ D₂) ∪ (D₁ ∩ D₂̅) et que D₁ ∩ D₂̅ et D₁ ∩ D₂ sont incompatibles. Il en résulte que p(D₁) = p(D₁ ∩ D₂) + p(D₁ ∩ D₂̅), donc p(D₁ ∩ D₂̅) = p(D₁) − p(D₁ ∩ D₂) = 60/1000 − 20/1000 = 0.04. De même, p(D₂ ∩ D₁̅) = p(D₂) − p(D₂ ∩ D₁) = 50/1000 − 20/1000 = 0.03.

Il est clair que D = (D₁ ∩ D₂̅) ∪ (D₂ ∩ D₁̅) et les événements D₁ ∩ D₂̅ et D₂ ∩ D₁̅ sont incompatibles. On en déduit que p(D) = p(D₁ ∩ D₂̅) + p(D₂ ∩ D₁̅) = 0.04 + 0.03 = 0.07.

<!-- page: 184 -->
## III. Équiprobabilité

<!-- type: course -->
Lorsqu'on lance une pièce de monnaie bien équilibrée, on jette un dé non pipé ou on effectue un tirage au hasard, les issues ont la même probabilité de réalisation ; on dit qu'on est en présence d'une situation d'équiprobabilité.

<!-- type: definition -->
**Définition et théorème.** Soit E l'univers d'une expérience aléatoire dans une situation d'équiprobabilité et P(E) l'ensemble des parties de E. L'application p définie de P(E) dans [0, 1] par p({a}) = 1 / card(E), pour tout événement élémentaire a de E, est une probabilité sur E, appelée probabilité uniforme.

**Propriété.** Si (E, P(E), p) est un espace probabilisé tel que la probabilité p est uniforme, alors p(A) = card(A) / card(E), pour tout événement A de E.

<!-- type: exercise -->
**Exercice résolu 2.** On jette deux dés équilibrés de couleurs rouge et verte et dont les faces sont numérotées de 1 à 6.

1. Déterminer l'univers E de l'expérience et donner son cardinal.
2. Calculer la probabilité d'obtenir le même chiffre sur les deux dés.
3. Calculer la probabilité d'obtenir deux chiffres distincts.

**Solution.** 1. Les dés sont discernables par leur couleur. On en déduit que E = { (i, j) tels que 1 ≤ i ≤ 6 et 1 ≤ j ≤ 6 } et card(E) = 36.

2. L'événement A « Obtenir le même chiffre sur les deux dés » est tel que A = { (i, i), 1 ≤ i ≤ 6 }. Par suite, card(A) = 6 et p(A) = 6/36 = 1/6.

3. La probabilité d'obtenir deux chiffres distincts est p(B) = 1 − p(A) = 5/6.

<!-- type: exercise -->
**Activité.** Un code comporte deux lettres suivies de deux chiffres.

1. Dénombrer les codes possibles.
2. Un enfant compose un code au hasard. Calculer la probabilité d'obtenir : a. un code commençant par la lettre A ; b. un code contenant les lettres A et Z ; c. un code contenant le chiffre 0 deux fois ; d. un code ne contenant pas de chiffre pair.

<!-- page: 185 -->
## IV. Probabilité conditionnelle

<!-- type: exercise -->
**Activité 1.** Un enquêteur effectue un sondage auprès de familles ayant deux enfants et s'intéresse à la composition des enfants suivant le sexe (F ou G) et leurs âges. On suppose que les naissances des filles et des garçons sont équiprobables.

1. Il choisit une famille au hasard.
 a. Déterminer les quatre éléments possibles de l'univers de cette expérience.
 b. Quelle est la probabilité que l'aîné des enfants soit une fille ?
 c. Quelle est la probabilité que cette famille ait deux filles ?
 d. Quelle est la probabilité que cette famille ait deux garçons ?
 e. Quelle est la probabilité que cette famille ait un garçon et une fille ?
2. Il sonne à la porte de la demeure de l'une de ces familles. Une fille vient ouvrir la porte.
 a. Quelle est alors la probabilité que l'autre enfant soit une fille ?
 b. Quelle est alors la probabilité que l'autre enfant soit un garçon ?

<!-- type: definition -->
**Théorème.** Soit (E, P(E), p) un espace probabilisé et B un événement tel que p(B) ≠ 0. L'application p_B de P(E) dans [0, 1], définie par p_B(A) = p(A ∩ B) / p(B), pour tout événement A, est une probabilité sur E.

**Démonstration.** L'égalité E ∩ B = B nous permet de déduire que p_B(E) = p(E ∩ B) / p(B) = p(B) / p(B) = 1.

De plus, p_B(∅) = p(∅ ∩ B) / p(B) = p(∅) / p(B) = 0.

Si α_j est un élément de B, alors {α_j} ∩ B = {α_j} et p_B({α_j}) = p({α_j}) / p(B).

De plus, si A est un événement de E tel que A = {α₁, …, α_k}, on peut écrire A ∩ B = {α'₁} ∪ {α'₂} ∪ … ∪ {α'_m}, où α'₁, α'₂, …, α'_m sont les éléments qui appartiennent à A et à B. Par suite, p(A ∩ B) est la somme des probabilités des événements élémentaires {α'₁}, {α'₂}, …, {α'_m}. On en déduit alors que p_B(A) = p({α'₁})/p(B) + p({α'₂})/p(B) + … + p({α'_m})/p(B).

<!-- page: 186 -->
## Probabilité B-conditionnelle (suite)

<!-- type: definition -->
**Définition.** Soit (E, P(E), p) un espace probabilisé et B un événement tel que p(B) ≠ 0. L'application p_B ainsi définie s'appelle probabilité B-conditionnelle. Le réel p_B(A) est noté p(A/B) (on lit « probabilité de A, sachant B »).

<!-- type: exercise -->
**Activité 2.** Une urne contient quatre boules rouges numérotées (1, 1, 2, 2) et deux boules vertes numérotées (1, 2). Un joueur tire une boule. On désigne par R l'événement « obtenir une boule rouge » et par D l'événement « obtenir une boule numérotée 2 ».

1. Quelle est la probabilité que le joueur tire une boule rouge ?
2. Le joueur a tiré une boule rouge. a. Quelle est alors la probabilité qu'elle soit numérotée 2 ? b. Quelle est alors la probabilité qu'elle soit numérotée 1 ?
3. Le joueur a tiré une boule verte. a. Quelle est alors la probabilité qu'elle soit numérotée 2 ? b. Quelle est alors la probabilité qu'elle soit numérotée 1 ?
4. a. Quelle est la probabilité que le joueur tire une boule rouge et numérotée 2 ? b. Quelle est la probabilité que le joueur tire une boule verte et numérotée 1 ?

<!-- type: course -->
Lorsqu'on est en présence d'une situation de conditionnement, il est conseillé d'établir un arbre de choix.

**Arbre de probabilité.** L'arbre de probabilité modélise la situation de conditionnement suivante : on effectue une expérience (I) comportant deux issues contraires B et B̅. L'expérience (I) étant effectuée, on procède à une expérience (II) comportant deux issues contraires A et A̅.

Premier niveau de l'arbre : branche vers B de probabilité p(B), branche vers B̅ de probabilité p(B̅) = 1 − p(B). Second niveau : à partir de B, branches vers B ∩ A de probabilité p(A/B) et vers B ∩ A̅ de probabilité p(A̅/B) ; à partir de B̅, branches vers B̅ ∩ A de probabilité p(A/B̅) et vers B̅ ∩ A̅ de probabilité p(A̅/B̅).

La probabilité d'une feuille de l'arbre est le produit des probabilités rencontrées le long du chemin : par exemple p(B ∩ A) = p(B) × p(A/B).

<!-- page: 187 -->
## Exercice résolu 3 (test de dépistage)

<!-- type: exercise -->
Un centre de santé se propose de dépister une maladie auprès d'une population de 1000 individus. On dispose des données suivantes : la proportion des personnes malades est de 10 % ; sur 100 personnes malades, 98 ont un test positif ; sur 100 personnes non malades, une seule personne a un test positif.

On choisit une personne au hasard et on la soumet à un test de dépistage. On note M « la personne est malade » et T « la personne a un test positif ».

1. Déterminer la probabilité qu'une personne malade ait un test positif, ainsi que la probabilité qu'une personne malade ait un test négatif.
2. Déterminer la probabilité qu'une personne non malade ait un test négatif, ainsi que la probabilité qu'une personne non malade ait un test positif.
3. Déterminer, à l'aide d'un arbre, les probabilités des événements ci-dessous : « La personne choisie est malade et a un test positif » ; « La personne choisie est malade et a un test négatif » ; « La personne choisie n'est pas malade et a un test positif » ; « La personne choisie n'est pas malade et a un test négatif ».
4. Déterminer les probabilités des événements ci-dessous : « La personne choisie a un test positif » ; « La personne choisie est malade sachant qu'elle a un test négatif ».

**Solution.** 1. On sait que sur 100 personnes malades, 98 ont un test positif et donc deux personnes ont un test négatif. Par suite, p(T/M) = 0.98 et p(T̅/M) = 0.02.

2. On sait que sur 100 personnes non malades, une seule a un test positif. C'est-à-dire que parmi 100 personnes non malades, 99 personnes ont un test négatif. Par suite, p(T/M̅) = 0.01 et p(T̅/M̅) = 0.99.

3. Dressons l'arbre de probabilité (M : 0.1, branches T/M = 0.98 et T̅/M = 0.02 ; M̅ : 0.9, branches T/M̅ = 0.01 et T̅/M̅ = 0.99). On déduit de l'arbre que :

p(T ∩ M) = 0.1 × 0.98 = 0.098 ; p(T̅ ∩ M) = 0.1 × 0.02 = 0.002 ; p(T ∩ M̅) = 0.9 × 0.01 = 0.009 ; p(T̅ ∩ M̅) = 0.9 × 0.99 = 0.891.

<!-- page: 188 -->
<!-- type: exercise -->
4. On peut écrire T = (T ∩ M) ∪ (T ∩ M̅). Les événements (T ∩ M) et (T ∩ M̅) étant incompatibles, p(T) = p(T ∩ M) + p(T ∩ M̅) = 0.098 + 0.009 = 0.107.

Il s'agit de déterminer la probabilité de l'événement M sachant que l'événement T̅ est réalisé. On sait que p(M ∩ T̅) = p(M/T̅) × p(T̅). Il en résulte que p(M/T̅) = 0.002 / 0.893 ≈ 0.0022.

Note : la valeur 0.893 est p(T̅) = 1 − p(T) = 1 − 0.107 = 0.893.

## Événements indépendants

<!-- type: exercise -->
**Activité 3.** On jette un dé équilibré dont les faces sont numérotées de 1 à 6. On considère les événements : A « Obtenir un numéro pair », B « Obtenir un multiple de 3 », C « Obtenir un multiple de 6 ». Calculer la probabilité de chacun des événements A, B, C, A ∩ B et A ∩ C.

<!-- type: definition -->
**Définition.** On dit que deux événements A et B sont indépendants lorsque p(A ∩ B) = p(A) × p(B). Dans le cas où p(B) ≠ 0, la réalisation de B n'influence pas celle de A, c'est-à-dire p(A/B) = p(A).

<!-- type: exercise -->
**Activité 4.** Une urne U₁ contient trois boules noires et six boules vertes. Une urne U₂ contient deux boules noires et trois boules vertes. On choisit une urne au hasard et on tire successivement deux boules, en remettant chaque fois la boule tirée dans l'urne choisie. On considère les événements A « obtenir une boule verte au premier tirage » et B « obtenir une boule verte au deuxième tirage ». Les événements A et B sont-ils indépendants ?

**Activité 5.** Trois personnes A, B et C participent à un jeu télévisé. L'animateur dispose de deux cadeaux qu'il se propose d'offrir au hasard aux candidats, pour cela il leur fait un tirage au sort (un candidat pourra recevoir deux cadeaux). On considère les événements A « la personne A ne reçoit aucun cadeau » et B « la personne B ne reçoit aucun cadeau ».

1. Calculer les probabilités des événements A, B et A ∩ B.
2. Les événements A et B sont-ils indépendants ?

<!-- page: 189 -->
## Formule des probabilités totales

<!-- type: exercise -->
**Activité 6.** Dans une usine, le tiers de la production provient de la machine A, le quart provient de la machine B et le reste provient de la machine C. Les trois machines fabriquent des ampoules de types 1 et 2. On a constaté que : sur 1000 ampoules produites par la machine A, 2 seulement sont défectueuses ; sur 1000 ampoules produites par la machine B, 10 seulement sont défectueuses ; sur 1000 ampoules produites par la machine C, 5 seulement sont défectueuses.

On choisit au hasard une ampoule emballée. Déterminer à l'aide d'un arbre les probabilités des événements ci-dessous :

a. « L'ampoule est défectueuse » ; b. « L'ampoule fonctionne » ; c. « L'ampoule provient de la machine A sachant qu'elle est défectueuse » ; d. « L'ampoule ne provient pas de la machine A sachant qu'elle fonctionne ».

<!-- type: definition -->
**Définition.** Soit E un ensemble fini ; les parties B₁, B₂, …, Bₙ forment une partition de E lorsqu'elles sont deux à deux disjointes et leur réunion est E.

**Théorème (probabilités totales).** Soit (E, P(E), p) un espace probabilisé, B₁, B₂, …, Bₙ des événements formant une partition de E tels que, pour tout i, p(Bᵢ) ≠ 0. Alors, pour tout événement A :

p(A) = Σ (i = 1 à n) p(A ∩ Bᵢ) = Σ (i = 1 à n) p(Bᵢ) × p(A/Bᵢ).

**Démonstration.** Les parties A ∩ B₁, A ∩ B₂, …, A ∩ Bₙ forment une partition de A. D'après l'additivité de la probabilité, p(A) = Σ (i = 1 à n) p(A ∩ Bᵢ). On déduit alors de la formule p(A ∩ Bᵢ) = p(Bᵢ) × p(A/Bᵢ) que p(A) = Σ (i = 1 à n) p(Bᵢ) × p(A/Bᵢ).

<!-- page: 189 - 191 (exercice résolu 4 se poursuit sur les pages 190 et 191) -->
## Exercice résolu 4 (tirages dans deux urnes)

<!-- type: exercise -->
Une urne U₁ contient sept boules noires et trois boules vertes. Une urne U₂ contient deux boules noires et huit boules vertes. On effectue une suite de tirages en remettant à chaque fois la boule tirée dans l'urne, suivant la règle suivante : si au (n − 1)-ème tirage on a obtenu une boule noire, alors le n-ème tirage s'effectue dans U₁ ; si au (n − 1)-ème tirage on a obtenu une boule verte, alors le n-ème tirage s'effectue dans U₂.

1. On choisit une urne au hasard et on fait le premier tirage. Déterminer la probabilité p₁ d'obtenir une boule noire.
2. On désigne par pₙ la probabilité de tirer une boule noire au n-ème tirage. a. Calculer p₂. b. Montrer que pₙ = (1/2) × pₙ₋₁ + 1/5, pour n ≥ 2.
3. a. Montrer que la suite (qₙ) définie par qₙ = pₙ − 2/5, pour n ≥ 1, est une suite géométrique. b. Déterminer pₙ en fonction de n et en déduire lim (n → +∞) pₙ.

<!-- page: 190 -->
<!-- type: exercise -->
**Solution.** 1. Notons : E₁ : « obtenir une boule noire au premier tirage » ; U₁ : « le premier tirage s'effectue dans U₁ » ; U₂ : « le premier tirage s'effectue dans U₂ ». Remarquons que le choix de l'urne étant fait au hasard, p(U₁) = p(U₂) = 0.5.

E₁ = (E₁ ∩ U₁) ∪ (E₁ ∩ U₂). Les événements E₁ ∩ U₁ et E₁ ∩ U₂ étant incompatibles, on obtient p₁ = p(E₁ ∩ U₁) + p(E₁ ∩ U₂) = p(E₁/U₁) × p(U₁) + p(E₁/U₂) × p(U₂).

De plus, p(E₁/U₁) = 7/10 et p(E₁/U₂) = 2/10. Par suite, p₁ = (7/10) × 0.5 + (2/10) × 0.5 = 9/20.

2. a. Notons E₂ : « obtenir une boule noire au deuxième tirage ». On peut alors écrire E₂ = (E₂ ∩ E₁) ∪ (E₂ ∩ E₁̅). Les événements E₂ ∩ E₁ et E₂ ∩ E₁̅ étant incompatibles, on en déduit que p₂ = p(E₂/E₁) × p(E₁) + p(E₂/E₁̅) × p(E₁̅).

De plus, p(E₂/E₁) = 7/10 et p(E₂/E₁̅) = 2/10. On en déduit que p₂ = (7/10) × p₁ + (2/10) × (1 − p₁) = (1/2) × p₁ + 1/5 = (1/2) × 9/20 + 1/5 = 17/40.

b. Notons Eₙ : « obtenir une boule noire au n-ème tirage ». On peut alors écrire Eₙ = (Eₙ ∩ Eₙ₋₁) ∪ (Eₙ ∩ Eₙ₋₁̅). Les événements Eₙ ∩ Eₙ₋₁ et Eₙ ∩ Eₙ₋₁̅ étant incompatibles, on en déduit que pₙ = p(Eₙ/Eₙ₋₁) × p(Eₙ₋₁) + p(Eₙ/Eₙ₋₁̅) × p(Eₙ₋₁̅).

Les égalités p(Eₙ/Eₙ₋₁) = 7/10 et p(Eₙ/Eₙ₋₁̅) = 2/10 impliquent que pₙ = (1/2) × pₙ₋₁ + 1/5.

<!-- page: 191 -->
<!-- type: exercise -->
3. a. Un simple calcul montre que la suite (qₙ) est une suite géométrique de raison 0.5 et de premier terme q₁ = p₁ − 2/5 = 9/20 − 8/20 = 1/20.

b. On déduit de la question 3.a que pₙ = 2/5 + (1/20) × (0.5)^(n−1), et que lim (n → +∞) pₙ = 2/5.

<!-- type: exercise -->
**Activité 7.** Le cycle d'un feu tricolore dure une minute : vert 25 s, orange 5 s et rouge 30 s.

1. Quelle est la probabilité que le feu soit vert ? orange ? rouge ?
2. Un automobiliste arrive à 10 mètres d'un feu tricolore et aucun véhicule ne le précède. On suppose que l'automobiliste passe sans s'arrêter, au feu vert avec une probabilité de 99 %, au feu orange avec une probabilité de 80 % et au feu rouge avec une probabilité de 1 %. Quelle est la probabilité que l'automobiliste passe sans s'arrêter ?

**Activité 8.** Une personne qui fait du sport un jour donné, fait du sport le lendemain avec la probabilité 0.4. Si elle ne fait pas de sport ce jour-là, elle en fera le lendemain avec la probabilité 0.8. Cette personne a fait du sport le lundi. Quelle est la probabilité qu'elle en fasse le jeudi ?

## V. Variables aléatoires (ou aléas numériques)

<!-- type: exercise -->
**Activité 1.** Une urne contient deux boules numérotées 4 et trois boules numérotées 2, indiscernables au toucher. On tire simultanément deux boules de l'urne.

1. a. Quelle est la probabilité de tirer deux boules numérotées 4 ? b. Quelle est la probabilité de tirer deux boules portant des numéros différents ? c. Quelle est la probabilité de tirer deux boules portant le même numéro ?
2. On note X l'application qui à tout événement élémentaire associe la somme des numéros des deux boules tirées. Quelles sont les différentes valeurs prises par X ?

<!-- type: definition -->
**Définition.** Soit (E, P(E), p) un espace probabilisé. On appelle aléa numérique ou variable aléatoire toute application X : E → ℝ.

**Notation.** L'événement {a ∈ E ; X(a) = x} est noté (X = x). L'ensemble X(E) désigne l'ensemble des valeurs prises par X.

<!-- page: 192 -->
<!-- type: exercise -->
**Activité 2.** On lance une pièce de monnaie bien équilibrée trois fois de suite.

1. Déterminer l'ensemble de toutes les issues possibles.
2. On note X la variable aléatoire qui à chaque événement élémentaire associe le nombre de côtés « face » obtenus. a. Quelle est la probabilité de l'événement (X = 0) ? b. Quelle est la probabilité de l'événement (X = 1) ? c. Quelle est la probabilité de l'événement (X = 2) ? d. Quelle est la probabilité de l'événement (X = 3) ?

<!-- type: definition -->
**Définition (loi de probabilité).** Soit (E, P(E), p) un espace probabilisé et X une variable aléatoire. On appelle loi de probabilité de X, ou distribution de X, l'application P_X : X(E) → [0, 1], xᵢ ↦ p(X = xᵢ).

**Conséquences.** Soit (E, P(E), p) un espace probabilisé. Si X est une variable aléatoire sur E telle que X(E) = {x₁, x₂, …, xₙ}, alors Σ (i = 1 à n) p(X = xᵢ) = 1.

**Démonstration.** Les parties (X = x₁), (X = x₂), …, (X = xₙ) forment une partition de E. On en déduit que Σ (i = 1 à n) p(X = xᵢ) = p(E) = 1.

<!-- type: exercise -->
**Activité 3.** Une entreprise organise un concours pour recruter un cadre. Trois candidats se présentent. Chacun d'eux passe un test et le premier qui y satisfait est engagé. La probabilité qu'a un candidat de réussir le test est p. On définit la variable aléatoire X de la manière suivante : X = j si le j-ème candidat qui se présente est engagé, et X = 4 si aucun candidat n'est engagé. Déterminer la loi de X.

## VI. Espérance et variance d'une variable aléatoire

<!-- type: definition -->
**Définition (espérance).** Soit (E, P(E), p) un espace probabilisé et X une variable aléatoire sur E telle que X(E) = {x₁, x₂, …, xₙ}. On appelle espérance mathématique, ou moyenne de X, le nombre E(X) = Σ (i = 1 à n) xᵢ × pᵢ, où pᵢ = p(X = xᵢ).

<!-- page: 193 -->
<!-- type: exercise -->
**Activité 1.** On lance un dé de six faces numérotées de 1 à 6 et on désigne par X l'aléa numérique qui à chaque lancer associe le numéro obtenu et par Y l'aléa qui à chaque lancer associe 1 si le numéro obtenu est pair et −1 si le numéro obtenu est impair. Calculer E(X), E(−3X), E(Y) et E(X + Y).

<!-- type: definition -->
**Théorème (linéarité de l'espérance).** Soit (E, P(E), p) un espace probabilisé et X, Y deux variables aléatoires sur E. Alors :

- pour tout réel α, E(αX) = α × E(X) ;
- E(X + Y) = E(X) + E(Y).

<!-- type: definition -->
**Définition (variance et écart-type).** Soit (E, P(E), p) un espace probabilisé et X une variable aléatoire sur E. On appelle variance de X le nombre V(X) = E((X − E(X))²). On appelle écart-type de X le nombre σ(X) = √V(X).

**Propriété.** Soit (E, P(E), p) un espace probabilisé. Si X est une variable aléatoire sur E, alors V(X) = E(X²) − (E(X))².

<!-- type: exercise -->
**Activité 2.** Un marchand de glaces propose 5 parfums au choix. Trois personnes choisissent, au hasard et indépendamment, un des parfums proposés.

1. a. Calculer la probabilité de l'événement « les trois personnes choisissent des parfums deux à deux différents ». b. Calculer la probabilité de l'événement « les trois personnes choisissent le même parfum ».
2. On note X la variable aléatoire qui à chaque événement élémentaire associe le nombre de parfums choisis par les trois personnes. a. Déterminer la loi de probabilité de X. b. Calculer l'espérance et l'écart-type de X.

**Activité 3.** Une enveloppe contient les douze figures d'un jeu de cartes, les quatre rois, les quatre dames et les quatre valets.

1. On tire, simultanément et au hasard, cinq cartes de l'enveloppe. Soit X la variable aléatoire qui, à chaque tirage, associe le nombre de rois obtenus. a. Déterminer la loi de probabilité de X. b. Calculer son espérance et son écart-type.
2. On tire, successivement et au hasard, cinq cartes de l'enveloppe en remettant chaque fois la carte dans l'enveloppe. Soit Y la variable aléatoire qui, à chaque tirage, associe le nombre de rois obtenus. a. Déterminer la loi de probabilité de Y. b. Calculer son espérance et son écart-type.
3. Comparer les résultats des questions 1.b et 2.b. Interpréter.

<!-- page: 194 -->
## VII. Fonction de répartition d'une variable aléatoire

<!-- type: exercise -->
**Activité 1.** Soit (E, P(E), p) un espace probabilisé et X une variable aléatoire sur E. On a représenté ci-contre la fonction F : ℝ → [0, 1], x ↦ p(X ≤ x), où (X ≤ x) désigne l'ensemble {a ∈ E ; X(a) ≤ x}.

La courbe est une fonction en escalier : elle vaut 0.1 pour x ∈ [1, 2[ (fond à 0 avant 1), 0.3 sur [2, 4[, 0.8 sur [4, 5[, 0.9 sur [5, +∞[ et 1 à partir de ... les sauts ont lieu en x = 1, 2, 4 et 5 avec hauteurs successives 0.1, 0.3, 0.8, 0.9, puis 1.

Déterminer graphiquement :

1. les valeurs prises par X ;
2. p(X ≤ −1), p(X ≤ 1.3), p(X ≤ 11/3), p(X ≤ 1), p(X < 2), p(X = 2), p(1 ≤ X ≤ 6) ;
3. la loi de probabilité de X.

<!-- type: exercise -->
**Activité 2.** Une pièce de monnaie est truquée de sorte que la probabilité d'obtenir pile est égale à 0.6. On lance la pièce trois fois et on note X la variable aléatoire associant à cette épreuve le nombre de piles obtenus.

1. Déterminer la loi de probabilité de X.
2. On considère l'application F : ℝ → [0, 1], x ↦ p(X ≤ x). Déterminer l'expression de F et la représenter.

<!-- type: definition -->
**Définition.** Soit (E, P(E), p) un espace probabilisé et X une variable aléatoire sur E. On appelle fonction de répartition de X l'application définie de ℝ dans [0, 1] par F : x ↦ p(X ≤ x).

<!-- type: exercise -->
**Activité 3.** Trois urnes contiennent chacune des jetons numérotés de 1 à 6. On tire au hasard un jeton de chaque urne, et on note X la variable aléatoire associant à chaque tirage le plus grand des numéros tirés.

1. Soit k un entier inférieur ou égal à 6. a. Dans chaque urne, quelle est la probabilité de tirer un numéro inférieur ou égal à k ? b. En déduire p(X ≤ k).
2. Déterminer la fonction de répartition de X et tracer sa courbe.
3. Déterminer la loi de probabilité de X.

<!-- page: 195 -->
## VIII. Loi binomiale

<!-- type: exercise -->
**Activité 1.** La probabilité qu'un joueur de fléchettes atteigne sa cible est égale à 0.9.

1. On suppose que le joueur effectue deux tirs et on note X la variable aléatoire associant à cette épreuve le nombre de succès réalisés. a. Déterminer la loi de probabilité de X. b. Déterminer la probabilité de l'événement « le joueur atteint au moins une fois sa cible ».
2. On suppose que le joueur effectue dix tirs et on note Y la variable aléatoire associant à cette épreuve le nombre de succès réalisés. a. Calculer la probabilité des événements suivants : « le joueur réalise neuf succès », « le joueur réalise au moins un succès ». b. Déterminer la loi de probabilité de Y.

<!-- type: definition -->
**Théorème et définition.** Soit une expérience aléatoire constituée de n épreuves identiques, indépendantes et n'ayant que deux issues : succès ou échec. Soit p la probabilité de l'événement succès.

On considère la variable aléatoire X associant à cette expérience le nombre de succès réalisés au cours des n épreuves. Alors la loi de probabilité de X est donnée par :

p(X = k) = C_n^k × p^k × (1 − p)^(n−k), pour k ∈ {0, 1, …, n}.

On dit que X suit une loi binomiale de paramètre (n, p).

**Notation.** La loi binomiale de paramètre (n, p) est notée B(n, p). Lorsque n = 1, on dit que X suit une loi de Bernoulli.

<!-- type: exercise -->
**Activité 2.** Un mobile se déplace sur un axe (O, i⃗). À l'instant t = 0, il est au point O ; à chaque seconde, son abscisse augmente de 1 avec la probabilité 1/2 ou diminue de 1 avec la probabilité 1/2.

1. À l'instant t = 2 : a. Quelle est la probabilité qu'il soit au point d'abscisse 2 ? b. Quelle est la probabilité qu'il soit au point O ?
2. À l'instant t = n : a. Quelle est la probabilité qu'il soit au point d'abscisse n ? b. Quelle est la probabilité qu'il soit au point d'abscisse −n ?

<!-- page: 196 -->
<!-- type: exercise -->
**Activité 3.** On lance n fois (n ≥ 1) un dé. On note A l'événement « obtenir au moins un 6 ».

1. Calculer p(A) pour n = 3.
2. Exprimer p(A) en fonction de n.
3. Combien de fois au moins faut-il lancer le dé pour que la probabilité de A soit supérieure ou égale à 0.9 ?

<!-- type: definition -->
**Espérance et variance de la loi binomiale.** Soit X une variable aléatoire suivant une loi binomiale B(n, p). On a :

E(X) = np ; V(X) = np × (1 − p) et σ(X) = √(np × (1 − p)).

## B. Exemples de lois continues

## I. La loi uniforme

<!-- type: exercise -->
**Activité 1.**

1. a. Soit l'intervalle I = [−1, 1]. Quelle est son amplitude ? b. Soit f la fonction définie sur I par f(x) = 1/2. Calculer ∫ (−1 à 1) f(x) dx. c. Montrer que pour tout intervalle [c, d] de [−1, 1], ∫ (c à d) f(x) dx = (d − c)/2, qui appartient bien à [0, 1].
2. Soit f une fonction constante sur un intervalle [a, b]. a. Quelle valeur doit-on donner à f pour que ∫ (a à b) f(x) dx = 1 ? b. Montrer que dans ce cas ∫ (c à d) f(x) dx = (d − c)/(b − a), pour tout intervalle [c, d] de [a, b].

<!-- type: definition -->
**Définition (densité uniforme).** Soit un intervalle [a, b] (a < b). La fonction f définie sur [a, b] par f(x) = 1/(b − a) est appelée densité de la loi de probabilité uniforme sur [a, b]. On appelle probabilité uniforme sur [a, b] l'application qui à tout intervalle [c, d] inclus dans [a, b] associe le réel P([c, d]) = ∫ (c à d) f(x) dx.

<!-- page: 197 -->
<!-- type: definition -->
**Conséquences.** Pour tout réel c de [a, b], P({c}) = ∫ (c à c) f(x) dx = 0. Si on désigne par [c,d]̅ le complémentaire de [c, d] dans [a, b], alors P([c,d]̅) = 1 − P([c, d]).

<!-- type: exercise -->
**Activité 2.** Un joueur lance une fléchette sur une cible circulaire de rayon 30 cm. Le joueur n'est pas expérimenté de sorte qu'il atteint aléatoirement la cible. On désigne par d la distance entre le centre de la cible et le point d'impact.

1. Quelles sont les valeurs possibles de d ?
2. On partage l'intervalle [0, 30] en 10 intervalles de même amplitude. a. Quelle est l'amplitude de ces intervalles ? b. Le réel d a-t-il plus de chances d'appartenir à un intervalle plutôt qu'à un autre ? c. Quelle est selon vous la probabilité que d appartienne à l'intervalle [0, 30] ? à [4, 5] ? à [9, 10] ?

<!-- type: course -->
Dans l'activité précédente le réel d varie de façon aléatoire dans l'intervalle [0, 30], mais de façon équirépartie. On dit alors que d est une variable aléatoire à valeurs dans [0, 30].

<!-- type: definition -->
**Définition.** On dit qu'une variable aléatoire X à valeurs dans un intervalle [a, b] suit la loi de probabilité uniforme P si P(c ≤ X ≤ d) = (d − c)/(b − a).

<!-- type: exercise -->
**Activité 3.** On considère un mobile M qui se déplace sur un cercle de centre O à partir d'un point A et qui s'arrête d'une manière aléatoire. On mesure alors l'angle α que fait [OA) avec [OM). Soit P la probabilité uniforme sur [0, 2π]. Calculer P(π/4 ≤ X ≤ π), P(π/4 ≤ X ≤ π/2) et P(0 ≤ X ≤ π).

<!-- page: 198 -->
<!-- type: exercise -->
**Activité 4.** On suppose que la durée (en minutes) du trajet qui sépare un employé de son travail est une variable aléatoire X à valeurs dans l'intervalle [30, 50] qui suit la loi de probabilité uniforme P.

1. Calculer P(30 ≤ X ≤ 40) et P(30 ≤ X ≤ 43).
2. On considère l'application F : [0, 1] → ℝ définie par :

F(x) = 0 si x < 30 ; F(x) = P(30 ≤ X ≤ x) si x ∈ [30, 50] ; F(x) = 1 si x > 50.

Déterminer l'expression de F et la représenter.

<!-- type: definition -->
**Définition (fonction de répartition uniforme).** Soit X une variable aléatoire qui suit la loi de probabilité uniforme P sur l'intervalle [a, b]. On appelle fonction de répartition de X l'application F : ℝ → [0, 1] définie par :

F(x) = 0 si x < a ; F(x) = P(a ≤ X ≤ x) = (x − a)/(b − a) si x ∈ [a, b] ; F(x) = 1 si x > b.

## II. La loi exponentielle

<!-- type: exercise -->
**Activité 1.**

1. Soit λ un réel strictement positif et f la fonction définie sur ]0, +∞[ par f(t) = λ × e^(−λt). a. Calculer ∫ (0 à x) f(t) dt et lim (x → +∞) ∫ (0 à x) f(t) dt. b. Montrer que pour tout intervalle [c, d] de ]0, +∞[, ∫ (c à d) f(x) dx = e^(−λc) − e^(−λd), qui appartient bien à [0, 1].

<!-- type: definition -->
**Définition (densité exponentielle).** Soit λ un réel strictement positif. La fonction f définie sur ]0, +∞[ par f(t) = λ × e^(−λt) est appelée densité de la loi exponentielle.

On appelle loi de probabilité exponentielle de paramètre λ l'application P qui :

- à tout intervalle [c, d] inclus dans ]0, +∞[ associe le réel P([c, d]) = ∫ (c à d) λ × e^(−λx) dx = e^(−λc) − e^(−λd) ;
- à tout intervalle ]c, +∞[ inclus dans ]0, +∞[ associe le réel P(]c, +∞[) = e^(−λc).

<!-- page: 199 -->
<!-- type: definition -->
**Conséquences.**

1. Pour tout réel c > 0, P({c}) = ∫ (c à c) f(x) dx = 0.
2. Pour tout réel c > 0, P([0, c]) = ∫ (0 à c) f(x) dx = 1 − e^(−λc).
3. P([c, +∞[) = 1 − P([0, c]).

<!-- type: exercise -->
**Activité 2.** On s'intéresse à la durée de vie t (en semaines) d'un appareil électronique. On suppose que la probabilité que l'appareil soit encore fonctionnel au bout d'un temps t est une loi de probabilité exponentielle de paramètre 0.5. Quelle est la probabilité que la durée de vie soit entre 100 et 200 semaines ?

<!-- type: course -->
Dans l'activité précédente le réel t varie de façon aléatoire mais selon une loi appelée loi exponentielle. On dit alors que t est une variable aléatoire qui suit la loi exponentielle de paramètre 0.5.

<!-- type: definition -->
**Définition.** On dit qu'une variable aléatoire X suit la loi exponentielle de paramètre λ si :

P(c ≤ X ≤ d) = ∫ (c à d) λ × e^(−λx) dx = e^(−λc) − e^(−λd), et P(X ≥ c) = e^(−λc).

<!-- type: exercise -->
**Activité 3.** Une variable aléatoire X suit une loi exponentielle de paramètre λ.

1. Déterminer λ sachant que P(X ≥ 10) = 0.5.
2. Déterminer alors P(0 ≤ X ≤ 10), P(100 ≤ X ≤ 300) et P(X ≥ 300).
3. On considère l'application F : ℝ → [0, 1] définie par : F(x) = 0 si x < 0 ; F(x) = P(0 ≤ X ≤ x) si x ∈ [0, +∞[.

 a. Déterminer l'expression de F. b. Calculer lim (x → +∞) F(x). c. Représenter F.

<!-- page: 200 -->
<!-- type: definition -->
**Définition (fonction de répartition exponentielle).** Soit X une variable aléatoire qui suit la loi de probabilité exponentielle P de paramètre λ. On appelle fonction de répartition de X l'application F : ℝ → [0, 1] définie par :

F(x) = 0 si x < 0 ; F(x) = P(0 ≤ X ≤ x) = 1 − e^(−λx) si x ∈ [0, +∞[.

<!-- type: exercise -->
**Activité 4.** Soit X une variable aléatoire qui suit la loi de probabilité exponentielle P de paramètre λ. Dans la figure ci-contre on a représenté la fonction de répartition de X : la courbe passe par le point (1 ; 0.85).

1. Déterminer une valeur approchée à 10^−1 près du paramètre λ.
2. Calculer p(X ≥ 2).

<!-- page: 201 -->
## QCM (exercices)

<!-- type: exercise -->
**QCM.** Cocher la réponse exacte.

1. On représente une expérience aléatoire par l'arbre de probabilité ci-contre : de la racine, une branche de probabilité 0.9 mène à A et une branche de probabilité 0.1 mène à A̅ ; de A, une branche de probabilité 0.1 mène à B ∩ A et une branche de 0.9 mène à B̅ ∩ A ; de A̅, une branche de probabilité 0.9 mène à A̅ ∩ B et une branche de 0.1 mène à A̅ ∩ B̅.

 a. La probabilité de B sachant A est égale à : 0.9 / 0.1 / 0.09.
 b. La probabilité de l'événement A̅ ∩ B̅ est égale à : 0.01 / 0.1 / 0.2.
 c. La probabilité de l'événement A sachant B est égale à : 0.09 / 0.5 / 0.9.

2. Si X est une variable aléatoire qui suit la loi exponentielle de paramètre 0.1, alors l'arrondi au centième de p(X > 10) est : 0.63 / 0.37 / 0.91.

3. Une variable aléatoire X suit la loi binomiale de paramètre 3 et 1/3. La probabilité de l'événement (X > 2) est : (1/3)³ / (2/3)³ / C₃² × (1/3) × (2/3)².

## VRAI - FAUX (exercices)

<!-- type: exercise -->
**VRAI - FAUX.** Répondre par vrai ou faux en justifiant la réponse.

1. Si deux événements A et B sont indépendants alors p(A ∪ B) = p(A) + p(B).
2. Si A ∪ B est l'événement certain alors, pour tout événement C, p(C) = p(A ∩ C) + p(B ∩ C).
3. Dans une expérience aléatoire, la probabilité d'un événement A est égale à 0.2. On répète huit fois cette expérience de façon indépendante. La probabilité que l'événement A se réalise au moins une fois est égale à 1 − (0.8)⁸.
4. Les situations de tirages sans remise obéissent à une loi binomiale.
5. La probabilité de choisir au hasard un réel entre 0 et 0.0000001 est égale à 0.

<!-- page: 202 -->
## Exercices et problèmes 1 à 3

<!-- type: exercise -->
**Exercice 1.** Dans une urne, une boule est numérotée 1, deux boules sont numérotées 2, trois boules sont numérotées 3, quatre boules sont numérotées 4, … et enfin neuf boules sont numérotées 9.

1. Combien y a-t-il de boules dans l'urne ?
2. On tire deux boules simultanément et au hasard. a. Quelle est la probabilité que les deux numéros soient pairs ? b. Quelle est la probabilité que la somme des deux numéros obtenus soit supérieure ou égale à 3 ? c. Quelle est la probabilité que la somme des deux numéros obtenus soit inférieure ou égale à 15 ?
3. On tire quatre boules successivement, sans les remettre dans l'urne, et on les aligne dans l'ordre où on les a tirées. La probabilité d'obtenir 1983 est-elle la même que celle d'obtenir 1389 ?
4. On tire quatre boules successivement, en les remettant dans l'urne, et on les aligne dans l'ordre où on les a tirées. La probabilité d'obtenir 1983 est-elle la même que celle d'obtenir 1389 ?

**Exercice 2.** Un élève effectue un sondage dans sa classe (qui comprend 40 élèves). Les 40 élèves ont répondu par oui ou par non aux trois questions « Aimez-vous les mathématiques ? », « Aimez-vous la philosophie ? » et « Aimez-vous le sport ? ». La première question a obtenu 31 « oui », la deuxième question, un « oui » et la troisième question, 9 « oui ». Un supplément d'enquête a donné les résultats suivants : 1 élève aime seulement la philosophie, 3 élèves aiment seulement le sport, 25 élèves aiment seulement les mathématiques.

Quelle est la probabilité qu'un élève interrogé au hasard :

1. aime à la fois les trois matières ? 2. aime les mathématiques et n'aime pas le sport ? 3. n'aime pas la philosophie et les mathématiques ? 4. n'aime aucune matière ? 5. aime au moins une matière ?

**Exercice 3.** Le programme d'une épreuve d'examen comporte 100 questions. Un candidat n'en étudie que 80. Lors d'un examen, le candidat tire au sort trois questions ; quelle est la probabilité qu'il ait étudié :

1. les trois questions proposées ? 2. deux questions seulement ? 3. une seule question ? 4. aucune des trois ? 5. au moins une des trois ?

<!-- page: 202 - 203 (exercices 4 à 7) -->
## Exercices et problèmes 4 à 7

<!-- type: exercise -->
**Exercice 4.** Lors d'un concours, la première épreuve est une épreuve de mathématiques, la deuxième épreuve est une épreuve de sciences physiques. Un élève a 80 % de chances de réussir la première épreuve ; s'il réussit la première épreuve, il aura 75 % de chances de réussir la deuxième épreuve ; et s'il ne réussit pas la première épreuve, il aura 40 % de chances de réussir la deuxième épreuve. On désigne par M l'événement « l'élève réussit la première épreuve » et par S l'événement « l'élève réussit la deuxième épreuve ». Déterminer p(M), p(S/M), p(S/M̅) et p(S).

**Exercice 5.** Le personnel d'une grande entreprise est réparti en trois catégories : les ingénieurs, les techniciens et le personnel administratif. 10 % des employés sont des ingénieurs et 80 % sont des techniciens. 80 % des employés sont des femmes, 60 % des ingénieurs sont des hommes et 90 % des techniciens sont des femmes. On interroge un employé au hasard.

1. a. Quelle est la probabilité d'interroger une femme ingénieur ? b. Quelle est la probabilité d'interroger un homme technicien ? c. Quelle est la probabilité d'interroger une femme du personnel administratif ?
2. On sait que l'employé interrogé est une femme. a. Quelle est alors la probabilité qu'elle soit technicienne ? b. Quelle est alors la probabilité qu'elle soit ingénieur ?
3. On sait que l'employé interrogé est un ingénieur. a. Quelle est alors la probabilité que ce soit une femme ? b. Quelle est alors la probabilité que ce soit un homme ?

**Exercice 6.** Un magasin vend deux types de téléphones portables : des modèles de marque A et des modèles de marque B. Le magasin propose deux types d'abonnement : un abonnement de type I et un abonnement de type II. Le service marketing effectue une enquête sur un échantillon de 2000 clients ayant acheté chez ce magasin un seul téléphone et choisi un seul abonnement. Sur les 2000 clients, 1200 ont acheté le modèle A. Sur les 2000 clients, 960 ont choisi l'abonnement I. On note S l'événement « avoir acheté le modèle A » et C « avoir choisi l'abonnement I ».

Un client est choisi au hasard dans l'échantillon.

1. Quelle est la probabilité qu'il ait acheté le modèle A ?
2. Parmi les clients qui ont acheté le modèle A, 32 % ont choisi l'abonnement I. a. Quelle est la probabilité que le client ait acheté le modèle A et choisi l'abonnement I ? b. Quelle est la probabilité que le client ait acheté le modèle B et choisi l'abonnement II ?

<!-- page: 203 -->
<!-- type: exercise -->
**Exercice 7.** Une urne contient huit jetons : trois noirs portant tous le numéro 1, trois noirs portant tous le numéro 2, un vert portant le numéro 1, un vert portant le numéro 2. Une épreuve consiste à extraire au hasard deux jetons selon une procédure déterminée par le lancer d'une pièce truquée : si l'on obtient pile, on extrait deux jetons simultanément ; si l'on obtient face, on extrait les deux jetons successivement sans remise. Lors du lancer de la pièce, la probabilité d'obtenir pile est égale à 7/15.

On note P l'événement « obtenir pile », F l'événement « obtenir face », A « les deux jetons portent le même numéro ou ont la même couleur », B « les deux jetons portent le même numéro et ont la même couleur », C « les deux jetons tirés ont la même couleur », D « les deux jetons tirés portent le même numéro ».

1. Déterminer les probabilités p(C/P), p(D/P), p(B/P) et p(A/P).
2. Déterminer p(A/F) et en déduire p(A).

**Exercice 8.** Deux joueurs X et Y s'entraînent au tir à la cible. Le joueur X est expérimenté et atteint sa cible 9 fois sur 10 et le joueur Y est débutant et atteint sa cible 4 fois sur 10. X laisse Y s'entraîner et n'effectue qu'un tir sur trois. Un des joueurs tire et la cible est atteinte. Quelle est la probabilité que ce soit Y ?

**Exercice 9.** Un joueur est en présence de deux urnes A et B. Dans l'urne A, il y a trois boules blanches et cinq boules rouges. Dans l'urne B, il y a sept boules blanches et cinq boules rouges. Le joueur dispose de deux dés non pipés et de couleurs différentes qu'il lance une fois. Si le total des points obtenus est inférieur ou égal à 7, il choisit l'urne A. Si le total des points obtenus est strictement supérieur à 7, il choisit l'urne B. Il tire alors dans l'urne choisie, successivement, quatre boules sans remise.

1. Calculer la probabilité qu'il obtienne 2 boules blanches et 2 boules rouges.
2. Calculer la probabilité qu'il n'obtienne que des boules rouges.
3. Le joueur n'obtient que des boules rouges. Quelle est la probabilité p que ce soit l'urne B qui ait été choisie ?

**Exercice 10.** Deux amis se rendent indépendamment l'un de l'autre sur un lieu de vacances. Les jours d'arrivée possibles pour chacun des deux amis sont numérotés de 1 à 8. Les deux amis choisissent chacun leur jour d'arrivée au hasard ; il reste alors trois jours dans ce lieu à attendre l'autre, puis ils repartent. Leurs séjours possibles se situent au cours de la période comportant les journées numérotées de 1 à 10.

1. Calculer la probabilité que les deux amis arrivent le même jour.
2. Calculer la probabilité que les deux amis arrivent avec un jour d'écart.
3. Calculer la probabilité que les deux amis puissent se rencontrer.
4. On sait que les deux amis se sont rencontrés. Quelle est la probabilité qu'ils aient pu passer ensemble au moins deux jours ?

<!-- page: 204 -->
## Exercices et problèmes 11 à 14

<!-- type: exercise -->
**Exercice 11.** Un individu essayant de réduire sa consommation de cigarettes applique les conditions suivantes. C₁ : s'il reste un jour sans fumer, alors la probabilité pour qu'il fume le lendemain est de 0.2. C₂ : par contre, s'il cède et fume un jour, alors la probabilité qu'il fume le lendemain est égale à 0.7.

On note Fₙ l'événement « l'individu fume le n-ème jour » et pₙ la probabilité de l'événement Fₙ.

1. À l'aide d'un arbre de choix, déterminer les probabilités des événements p(Fₙ/Fₙ₋₁), p(F̅ₙ/Fₙ₋₁), p(Fₙ/F̅ₙ₋₁) et p(F̅ₙ/F̅ₙ₋₁).
2. En déduire que, pour tout entier n ≥ 1, pₙ = 0.5 × pₙ₋₁ + 0.2.
3. Soit (aₙ) la suite définie par aₙ = pₙ − 0.4, pour n ≥ 1. a. Montrer que (aₙ) est une suite géométrique dont on précisera la raison et la limite. b. En déduire lim (n → +∞) pₙ. Interpréter.

**Exercice 12.** Des personnes P₁, P₂, …, Pₙ, … se transmettent une information dans cet ordre. Chaque personne transmet l'information de manière fidèle avec une probabilité égale à 0.9 ou la change en son contraire avec une probabilité égale à 0.1. On suppose que la première personne possède l'information non déformée. Pour tout n ≥ 1, on note Aₙ l'événement « la n-ème personne possède l'information non déformée » et pₙ sa probabilité.

1. Calculer p₁ et p₂.
2. Utiliser un arbre pour calculer p₃.
3. Montrer que, pour tout n ≥ 1, pₙ = 0.8 × pₙ₋₁ + 0.1.
4. a. Soit (qₙ) la suite définie par qₙ = pₙ − 1/2, pour n ≥ 1. Montrer que (qₙ) est une suite géométrique. b. Exprimer alors pₙ en fonction de n.
5. Quelle est la probabilité que la 20-ème personne possède l'information non déformée ?
6. Calculer lim (n → +∞) pₙ.

**Exercice 13.** Un dé cubique a trois faces portant le numéro 1, deux faces portant le numéro 2 et une face portant le numéro 3. On lance le dé deux fois et on désigne par X la variable aléatoire qui donne la somme des nombres obtenus.

1. Déterminer la loi de probabilité de X.
2. Calculer E(X) et V(X).
3. Déterminer la fonction de répartition F de X et tracer sa courbe.

**Exercice 14.** Un sac contient 10 jetons dont quatre sont rouges et six sont blancs. On extrait les jetons un à un sans remise. Soit X la variable aléatoire égale au rang d'apparition du premier jeton rouge. Trouver la loi de X, son espérance et sa variance.

<!-- page: 204 - 205 (exercices 15 à 19) -->
## Exercices et problèmes 15 à 19

<!-- type: exercise -->
**Exercice 15.** On lance deux dés identiques bien équilibrés. On note X la variable aléatoire égale au plus grand des nombres obtenus et Y la variable aléatoire égale au plus petit des nombres obtenus.

1. Déterminer les lois de X et Y.
2. Calculer l'espérance de X et celle de Y, ainsi que leurs variances.

**Exercice 16.** On jette 20 fois une pièce de monnaie.

1. Déterminer le nombre moyen de faces obtenus.
2. Déterminer la probabilité d'obtenir un nombre de faces égal à 10.
3. Déterminer la probabilité d'obtenir un nombre de faces compris entre 9 et 11.
4. Déterminer la probabilité d'obtenir un nombre de faces compris entre 8 et 12.
5. Déterminer la probabilité d'obtenir un nombre de faces compris entre 7 et 13.

**Exercice 17.** Dans une production d'ampoules, la probabilité qu'une ampoule soit défectueuse est égale à 0.1. Dans un lot de 400 ampoules, déterminer la moyenne et l'écart-type de la distribution des pièces défectueuses.

**Exercice 18.** On dispose de trois tétraèdres parfaitement équilibrés. Chacun d'eux a une face peinte en bleu, une face peinte en jaune et deux faces peintes en rouge. On lance simultanément les trois tétraèdres.

1. Quelle est la probabilité qu'aucune face rouge ne soit visible ?
2. Quelle est la probabilité qu'aucune face bleue ne soit visible ?
3. Soit A l'événement « les six faces rouges sont visibles ». Calculer p(A).
4. On répète n fois l'expérience qui consiste à lancer les trois tétraèdres. Calculer la probabilité pₙ que l'événement A soit réalisé une et une seule fois.

**Exercice 19.**

1. On lance 2 dés non pipés. On désigne par A₂ « le total des numéros amenés est pair ». Calculer p(A₂).
2. On lance 3 dés non pipés. On désigne par A₃ « le total des numéros amenés est pair ». Calculer p(A₃).
3. On lance n dés non pipés. On désigne par Aₙ « le total des numéros amenés est pair ». Montrer par récurrence sur n que la suite (p(Aₙ)) est constante.

<!-- page: 205 -->
## Exercices et problèmes 20 à 22

<!-- type: exercise -->
**Exercice 20.** Un gène peut avoir deux états A « allèle dominant » ou a « allèle récessif ». Un individu peut avoir l'un des trois génotypes suivants : « AA », « Aa » ou « aa ». Un enfant récupère un allèle de chacun de ses deux parents.

1. On suppose que l'un des parents a le génotype « AA » et l'autre « Aa ». a. Quelle est la probabilité que l'enfant soit de type « AA » ? b. Quelle est la probabilité que l'enfant soit de type « Aa » ?
2. On suppose que les deux parents sont de génotype « Aa ». a. Quelle est la probabilité que l'enfant soit de type « AA » ? b. Quelle est la probabilité que l'enfant soit de type « Aa » ? c. Quelle est la probabilité que l'enfant soit de type « aa » ?
3. On note pₙ, qₙ et rₙ les probabilités respectives qu'un individu de la n-ème génération soit de type « AA », « Aa » ou « aa ». À l'aide d'un arbre, montrer que : a. pₙ₊₁ = (pₙ + qₙ/2)² ; b. rₙ₊₁ = (qₙ/2 + rₙ)² ; c. qₙ₊₁ = 1 − (pₙ + qₙ/2)² − (qₙ/2 + rₙ)².
4. On note α = p₀ − r₀. a. Montrer que pour tout n, pₙ − rₙ = α. b. Montrer que pour tout n, 2rₙ + qₙ = 1 − α.
5. En déduire que les suites (pₙ), (qₙ) et (rₙ) sont constantes.

**Exercice 21.** Dans une foire, une publicité annonce « Un billet sur deux est gagnant, achetez deux billets ». Dans cet exercice, on suppose qu'effectivement, sur le nombre de billets en vente, exactement un billet sur deux est gagnant.

1. Un jour, cent billets sont mis en vente. Un promeneur en achète deux. Calculer la probabilité qu'il ait au moins un billet gagnant.
2. Un autre jour, 2n billets sont mis en vente. Un promeneur en achète deux. Soit pₙ la probabilité qu'il ait au moins un billet gagnant. a. Montrer que pₙ = (3n − 1)/(4n − 2). b. Calculer p₁ et expliquer le résultat. c. Montrer que, pour tout entier n non nul, 3/4 ≤ pₙ ≤ 1.
3. Tous les jours, 2n billets sont mis en vente. Un promeneur revient chaque jour, pendant 3 jours, acheter deux billets. a. Quelle est la probabilité qₙ qu'il obtienne au cours de ces 3 jours au moins un billet gagnant ? b. Étudier la limite de la suite (qₙ).

**Exercice 22.** Dans une loterie, on suppose que chaque billet a une chance sur 100 d'être gagnant.

1. On suppose qu'on achète n billets et on note A l'événement « avoir au moins un billet gagnant ». Exprimer en fonction de n la probabilité de l'événement A.
2. Combien de billets faut-il acheter pour que la probabilité d'avoir au moins un billet gagnant soit supérieure à 0.5 ?

<!-- page: 206 -->
## Exercices et problèmes 23 à 27

<!-- type: exercise -->
**Exercice 23.** Un sac contient n boules rouges et 2n boules noires indiscernables au toucher et ayant chacune la même probabilité d'être tirée. On tire simultanément trois boules du sac.

1. Quelle est la probabilité pₙ pour que parmi ces trois boules, il y ait une seule rouge ? En déduire que (pₙ) possède une limite finie que l'on notera p.
2. Quelle est la probabilité qₙ pour que parmi ces trois boules, il y ait au moins une rouge ? En déduire que (qₙ) possède une limite finie que l'on notera q.
3. On effectue trois tirages successifs d'une seule boule en remettant la boule tirée dans le sac avant d'effectuer le tirage suivant. a. Montrer que la probabilité d'obtenir une seule boule rouge est égale à p. b. Montrer que la probabilité d'obtenir au moins une boule rouge est égale à q.

**Exercice 24.** Un lot de n pièces contient une pièce défectueuse.

1. Une machine les teste une par une, jusqu'à détecter la pièce défectueuse. Elle effectue le n-ème test dans le cas où il ne reste que la pièce défectueuse. On note X la variable aléatoire égale au nombre de tests effectués. a. Quelle est la probabilité qu'il y ait un seul test ? b. Quelle est la probabilité qu'il y ait exactement deux tests ? c. Déterminer la loi de probabilité de X. d. Calculer l'espérance et la variance de X. (On rappelle que Σ (k = 1 à n) k² = n(n + 1)(2n + 1)/6.)
2. Dans cette question, on suppose que les tests sont effectués par un homme et que, s'il ne reste que deux pièces, celui-ci ne fait alors qu'un test supplémentaire. On note Y la variable aléatoire égale au nombre de tests effectués. a. Quelle est la probabilité qu'il y ait un seul test ? b. Quelle est la probabilité qu'il y ait exactement n − 1 tests ? c. Déterminer la loi de probabilité de Y. d. Calculer l'espérance et la variance de Y.

**Exercice 25.** Un joueur joue à pile ou face avec la règle suivante : il gagne dès que le nombre de fois où pile apparaît dépasse de deux le nombre de fois où face apparaît ; il perd dès que le nombre de fois où face apparaît dépasse de deux le nombre de fois où pile apparaît. On suppose que la pièce utilisée par le joueur est truquée de sorte qu'elle amène pile avec la probabilité 5/12 et face avec la probabilité 7/12.

1. Montrer que le joueur doit jouer un nombre pair de lancers pour gagner.
2. Calculer la probabilité pour que le joueur gagne au plus au bout de 2 lancers.
3. Calculer la probabilité pour que le joueur gagne au plus au bout de 4 lancers.
4. Calculer la probabilité pour que le joueur gagne au plus au bout de n lancers.
5. Calculer la probabilité pour que le joueur gagne au plus au bout de 20 lancers.

**Exercice 26.** On choisit un nombre x au hasard dans l'intervalle [0, 1].

1. Quelle est la probabilité que x soit égal à 0.1 ? à 0.0005 ? à 0.99999 ?
2. Quelle est la probabilité que x appartienne à l'intervalle [0.5, 1] ?
3. Quelle est la probabilité que x appartienne à l'intervalle [0.001, 0.002] ?
4. Quelle est la probabilité que x soit plus petit que 0.99999 ?
5. Quelle est la probabilité que x soit plus grand que 0.99999 ?

**Exercice 27.** Dans la journée, un bus passe toutes les 20 minutes à une station. Soit X le temps d'attente d'une personne à cette station. On suppose que X suit une loi uniforme sur [0, 20].

1. Quelle est la probabilité que cette personne attende entre 2 et 5 minutes ?
2. Quelle est la probabilité que cette personne attende entre 10 et 13 minutes ?
3. Quelle est la probabilité que cette personne attende exactement 3 minutes ?
4. Quelle est la probabilité que cette personne attende moins de 3 minutes ?
5. Quelle est la probabilité que cette personne attende plus de 3 minutes ?

<!-- page: 207 -->
## Exercices et problèmes 28 à 31

<!-- type: exercise -->
**Exercice 28.** On suppose que la durée de vie X, exprimée en années, d'une machine suit une loi exponentielle de paramètre 0.2.

1. a. Calculer la probabilité que X = 10. b. Calculer la probabilité que X ≤ 10. c. Calculer la probabilité que X ≥ 10.
2. Déterminer le réel c tel que P(X ≤ c) = P(X ≥ c).

**Exercice 29.** La durée de vie, exprimée en années, d'un robot jusqu'à ce que survienne la première panne suit une loi exponentielle de paramètre 0.0005.

1. Calculer la probabilité qu'un robot ait une durée de vie comprise entre 5 et 8 ans.
2. Calculer la probabilité qu'un robot dépasse 5 ans de durée de vie.
3. Calculer la probabilité qu'un robot dépasse 8 ans de durée de vie.

**Exercice 30.** Une machine fabrique des cylindres. On mesure l'écart X, en dixièmes de millimètres, entre le diamètre des cylindres et la valeur de réglage de la machine. On suppose que cet écart suit une loi exponentielle de paramètre 1.5.

1. Calculer, à 10⁻³ près, P(X ≤ 1), P(X ≥ 2) et P(1 ≤ X ≤ 2). Si l'écart est inférieur à 1, le cylindre est accepté. Si l'écart est compris entre 1 et 2, on procède à une rectification qui permet d'accepter le cylindre dans 80 % des cas. Si l'écart est supérieur à 2, le cylindre est refusé.
2. On prélève au hasard un cylindre dans la production. a. Quelle est la probabilité qu'il soit accepté ? b. On sait qu'il est accepté : quelle est alors la probabilité qu'il ait subi une rectification ?

**Exercice 31.** La durée de vie d'une machine, exprimée en années, jusqu'à ce que survienne la première panne est une variable aléatoire X qui suit une loi exponentielle de paramètre λ.

1. Déterminer λ, à 10⁻¹ près, pour que P(X ≥ 6) = 0.3. Dans la suite de l'exercice, on prendra λ = 0.2.
2. À quel instant t, à un mois près, la probabilité qu'une machine tombe en panne pour la première fois est-elle de 0.5 ?
3. Calculer la probabilité qu'une machine n'ait pas de panne au cours des deux premières années de sa vie.
4. On considère un lot de cinq machines fonctionnant de manière indépendante. Déterminer la probabilité que, dans ce lot, il y ait au moins une machine qui n'ait pas eu de panne au cours des deux premières années.
