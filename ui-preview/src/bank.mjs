export const bank=[
  {
    "id": "p1",
    "question": "Quand tu découvres une nouvelle notion, tu préfères…",
    "choices": [
      {
        "id": "step_by_step",
        "label": "des étapes numérotées"
      },
      {
        "id": "examples",
        "label": "un exemple résolu d'abord"
      },
      {
        "id": "visual",
        "label": "un schéma ou un graphique"
      },
      {
        "id": "analogy",
        "label": "une comparaison avec la vie de tous les jours"
      }
    ]
  },
  {
    "id": "p2",
    "question": "Quand tu bloques sur un exercice, tu aimerais…",
    "choices": [
      {
        "id": "step_by_step",
        "label": "qu'on te donne la prochaine étape"
      },
      {
        "id": "examples",
        "label": "voir un exercice semblable corrigé"
      },
      {
        "id": "visual",
        "label": "qu'on te dessine la situation"
      },
      {
        "id": "analogy",
        "label": "qu'on te l'explique avec une image"
      }
    ]
  },
  {
    "id": "s1",
    "question": "Quelle explication préfères-tu pour la révision espacée ?",
    "choices": [
      {
        "id": "step_by_step",
        "label": "1) Apprends une notion. 2) Essaie de la retrouver de mémoire le lendemain. 3) Reviens-y quelques jours plus tard."
      },
      {
        "id": "examples",
        "label": "Si tu apprends cinq mots lundi, teste-toi mardi puis vendredi au lieu de relire la liste cinq fois lundi."
      },
      {
        "id": "visual",
        "label": "Imagine trois points sur un calendrier : lundi → mardi → vendredi. Chaque point représente un rappel de la même notion."
      },
      {
        "id": "analogy",
        "label": "C'est comme répéter une chanson plusieurs jours de suite : chaque répétition ravive ce que tu commençais à oublier."
      }
    ]
  },
  {
    "id": "l1",
    "question": "Comment vérifier que tu as compris une leçon ?",
    "choices": [
      {
        "id": "L’expliquer sans notes",
        "label": "L’expliquer sans notes"
      },
      {
        "id": "Relire seulement le titre",
        "label": "Relire seulement le titre"
      },
      {
        "id": "Recopier le texte",
        "label": "Recopier le texte"
      },
      {
        "id": "Compter les pages",
        "label": "Compter les pages"
      }
    ]
  },
  {
    "id": "l2",
    "question": "Tu veux retenir une notion jusqu’à la semaine prochaine. Que fais-tu ?",
    "choices": [
      {
        "id": "Prévoir plusieurs rappels",
        "label": "Prévoir plusieurs rappels"
      },
      {
        "id": "Tout relire en une fois",
        "label": "Tout relire en une fois"
      },
      {
        "id": "Attendre la veille",
        "label": "Attendre la veille"
      },
      {
        "id": "Lire seulement le résumé",
        "label": "Lire seulement le résumé"
      }
    ]
  },
  {
    "id": "l3",
    "question": "Après une erreur, quelle action t’aide à progresser ?",
    "choices": [
      {
        "id": "Chercher sa cause puis réessayer",
        "label": "Chercher sa cause puis réessayer"
      },
      {
        "id": "Effacer la réponse",
        "label": "Effacer la réponse"
      },
      {
        "id": "Passer à un autre sujet",
        "label": "Passer à un autre sujet"
      },
      {
        "id": "Copier la correction",
        "label": "Copier la correction"
      }
    ]
  }
];
export const catalog={
  "subject": "math",
  "version": 1,
  "subtopics": [
    {
      "slug": "loi_binomiale",
      "label": "Loi binomiale",
      "parent": "probabilites"
    },
    {
      "slug": "denombrement",
      "label": "Dénombrement",
      "parent": "probabilites"
    },
    {
      "slug": "probabilites_conditionnelles",
      "label": "Probabilités conditionnelles",
      "parent": "probabilites"
    },
    {
      "slug": "variables_aleatoires",
      "label": "Variables aléatoires",
      "parent": "probabilites"
    }
  ],
  "program": "4ème année secondaire, section mathématiques",
  "status": "DRAFT: Ons checks every slug, label and link against the official program before the demo",
  "topics": [
    {
      "slug": "limites_continuite",
      "label": "Limites et continuité",
      "prerequisites": [],
      "next": [
        "derivabilite"
      ]
    },
    {
      "slug": "suites",
      "label": "Suites réelles",
      "prerequisites": [
        "limites_continuite"
      ],
      "next": [
        "integrales"
      ]
    },
    {
      "slug": "derivabilite",
      "label": "Dérivabilité",
      "prerequisites": [
        "limites_continuite"
      ],
      "next": [
        "etude_fonctions"
      ]
    },
    {
      "slug": "etude_fonctions",
      "label": "Étude de fonctions",
      "prerequisites": [
        "derivabilite"
      ],
      "next": [
        "primitives"
      ]
    },
    {
      "slug": "primitives",
      "label": "Primitives",
      "prerequisites": [
        "derivabilite"
      ],
      "next": [
        "integrales",
        "logarithme"
      ]
    },
    {
      "slug": "integrales",
      "label": "Calcul intégral",
      "prerequisites": [
        "primitives"
      ],
      "next": [
        "equations_differentielles"
      ]
    },
    {
      "slug": "logarithme",
      "label": "Fonction logarithme népérien",
      "prerequisites": [
        "primitives",
        "etude_fonctions"
      ],
      "next": [
        "exponentielle"
      ]
    },
    {
      "slug": "exponentielle",
      "label": "Fonction exponentielle",
      "prerequisites": [
        "logarithme"
      ],
      "next": [
        "equations_differentielles"
      ]
    },
    {
      "slug": "equations_differentielles",
      "label": "Équations différentielles",
      "prerequisites": [
        "exponentielle",
        "derivabilite"
      ],
      "next": []
    },
    {
      "slug": "nombres_complexes",
      "label": "Nombres complexes",
      "prerequisites": [],
      "next": [
        "similitudes"
      ]
    },
    {
      "slug": "probabilites",
      "label": "Probabilités",
      "prerequisites": [],
      "next": [
        "statistiques"
      ]
    },
    {
      "slug": "statistiques",
      "label": "Statistiques",
      "prerequisites": [],
      "next": []
    },
    {
      "slug": "geometrie_espace",
      "label": "Géométrie dans l'espace",
      "prerequisites": [],
      "next": []
    },
    {
      "slug": "isometries_plan",
      "label": "Isométries du plan",
      "prerequisites": [],
      "next": [
        "deplacements_antideplacements"
      ]
    },
    {
      "slug": "deplacements_antideplacements",
      "label": "Déplacements et antidéplacements",
      "prerequisites": [
        "isometries_plan"
      ],
      "next": [
        "similitudes"
      ]
    },
    {
      "slug": "similitudes",
      "label": "Similitudes",
      "prerequisites": [
        "deplacements_antideplacements",
        "nombres_complexes"
      ],
      "next": []
    },
    {
      "slug": "coniques",
      "label": "Coniques",
      "prerequisites": [],
      "next": []
    },
    {
      "slug": "divisibilite_z",
      "label": "Divisibilité dans Z",
      "prerequisites": [],
      "next": [
        "identite_bezout"
      ]
    },
    {
      "slug": "identite_bezout",
      "label": "Identité de Bézout",
      "prerequisites": [
        "divisibilite_z"
      ],
      "next": []
    }
  ]
};
