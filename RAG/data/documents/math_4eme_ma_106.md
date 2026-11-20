---
document_id: math_4eme_ma_106
country: Tunisia
educational_level: secondary
grade: 4eme_annee_secondaire
section: mathematiques
subject: Mathematics
topic: Integration
content_type: course
language: fr
source: OWN WORK - Primitives et calcul intégral (written for EdNova, awaiting teacher review)
---
<!-- page: 1 -->

<!-- type: definition -->
## Primitives

**Définition.** Une primitive de f sur un intervalle I est une fonction F dérivable sur I telle que F' = f. Toute fonction continue sur un intervalle admet des primitives, et deux primitives d'une même fonction diffèrent d'une constante.

<!-- type: course -->
## Primitives usuelles

xⁿ a pour primitive xⁿ⁺¹/(n + 1) pour n ≠ −1 ; 1/x a pour primitive ln|x| sur un intervalle ne contenant pas 0 ; cos x a pour primitive sin x et sin x a pour primitive −cos x. Pour u dérivable : u'·uⁿ a pour primitive uⁿ⁺¹/(n + 1), u'/u a pour primitive ln|u|, u'·e^u a pour primitive e^u et u'/√u a pour primitive 2√u.

<!-- page: 2 -->

<!-- type: definition -->
## Intégrale d'une fonction continue

**Définition.** Si f est continue sur un intervalle I contenant a et b et si F est une primitive de f, l'intégrale de a à b de f est ∫ₐᵇ f(x) dx = F(b) − F(a). La fonction x ↦ ∫ₐˣ f(t) dt est la primitive de f qui s'annule en a.

<!-- type: course -->
## Propriétés de l'intégrale

Linéarité, relation de Chasles ∫ₐᶜ f = ∫ₐᵇ f + ∫ᵇᶜ f, positivité : si a ≤ b et f ≥ 0 sur [a, b], alors ∫ₐᵇ f ≥ 0. Inégalité de la moyenne : si m ≤ f ≤ M sur [a, b] avec a < b, alors m(b − a) ≤ ∫ₐᵇ f ≤ M(b − a). La valeur moyenne de f sur [a, b] est (1/(b − a))·∫ₐᵇ f(x) dx. Si f est positive, ∫ₐᵇ f(x) dx est l'aire, en unités d'aire, du domaine compris entre la courbe, l'axe des abscisses et les droites x = a et x = b.

## Intégration par parties

Si u et v sont dérivables sur [a, b] avec u' et v' continues, alors ∫ₐᵇ u(x)v'(x) dx = [u(x)v(x)]ₐᵇ − ∫ₐᵇ u'(x)v(x) dx.

<!-- page: 3 -->

<!-- type: exercise -->
## Exercice 1 : intégration par parties

**Énoncé.** Calculer I = ∫₀¹ x·eˣ dx.

**Solution.** On pose u(x) = x et v'(x) = eˣ, donc u'(x) = 1 et v(x) = eˣ. I = [x·eˣ]₀¹ − ∫₀¹ eˣ dx = e − (e − 1) = 1.

## Exercice 2 : reconnaître une forme u'·u

**Énoncé.** Calculer J = ∫₁ᵉ (ln x)/x dx.

**Solution.** (ln x)/x est de la forme u'·u avec u = ln x, de primitive (ln x)²/2. J = (ln e)²/2 − (ln 1)²/2 = 1/2.
