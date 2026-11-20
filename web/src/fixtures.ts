import type {ChatResult, DiagnosticCard, Profile, ProgressRow, Receipt} from './lib/types';

export const bank: DiagnosticCard[] = [
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
export {mathCatalog as catalog} from './lib/math-catalog';

const receipt: Receipt = {llm_calls: 1, compact_calls: 1, mid_calls: 0, tokens_in: 204, tokens_out: 96, latency_ms: 620, cache: null, events: []};

const success: ChatResult = {
  response_id: 'preview-response',
  mode: 'explain',
  answer: "Pour $f(x)=3x^2$, la dérivée est $f'(x)=6x$. On applique la règle de dérivation d’une puissance.",
  badge: 'course',
  sources: [{chunk_id: 'math_chunk_001', source: 'Manuel, tome 2', page: 147}],
  topic: 'derivabilite',
  next_step: null,
  ai_generated: true,
  label: 'Réponse générée par IA',
  capacity_level: 'FULL',
  degraded: false,
  trace: [],
  receipt,
};

export const chatFixtures: Record<string, ChatResult> = {
  success,
  busy: {...success, badge: null, answer: '', sources: [], retry_after: 12, capacity_level: 'OFFLINE', receipt: {...receipt, llm_calls: 0}},
  degraded: {
    ...success,
    badge: 'course_excerpt',
    answer: 'La dérivée de la fonction $x \\mapsto x^2$ est la fonction $x \\mapsto 2x$.',
    ai_generated: false,
    label: 'sans IA',
    capacity_level: 'ECO',
    degraded: true,
  },
  hint0: {...success, mode: 'guided', hint_rung: 0, answer: 'Calcule la dérivée de $f(x)=3x^2$.'},
  hint1: {...success, mode: 'guided', hint_rung: 1, answer: "Utilise la règle $(x^n)'=nx^{n-1}$."},
  hint2: {...success, mode: 'guided', hint_rung: 2, answer: 'Dérive d’abord $x^2$, puis conserve le coefficient 3.'},
};

export const scenarioNames = ['success', 'empty', 'busy', 'degraded', 'error', 'hint0', 'hint1', 'hint2', 'mastery-null', 'mastery-zero', 'timer-idle', 'timer-running', 'timer-stopped', 'timer-error', 'permission', 'unknown', 'correct', 'incorrect', 'incomplete', 'login-failed', 'duplicate', 'expired', 'register-error', 'pending', 'delete-error', 'delete-success', 'save-success', 'pro-profile', 'pro-requested', 'pro-required'] as const;
export type ScenarioName = (typeof scenarioNames)[number];

export const profileFixture: Profile = {
  student_plan: 'free',
  pro_requested: false,
  level: 'beginner',
  subjects: ['math'],
  preferred_format: 'examples',
  city: null,
  diagnostic_score: null,
  grade: '4eme_annee_secondaire',
  section: 'mathematiques',
  subject: 'math',
  reply_language: 'fr',
};

export const progressFixture: ProgressRow[] = [
  {topic: 'probabilites', label: 'Probabilités', mastery: 0, attempts: 1, solved: 0, confusions: 0},
  {topic: 'derivabilite', label: 'Dérivabilité', mastery: null, attempts: 0, solved: 0, confusions: 0},
];
