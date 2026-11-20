import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import type {ApiError, StudentPlan} from './types';

/** The proposed monthly price of Pro, from docs/business-model.md. */
export const PRO_PRICE_TND = 15;

/** What the backend names in a 403 `pro_required`. */
export type ProFeature = 'personal_quiz' | 'mistake_practice' | 'host_session' | 'group_sessions' | 'interactive_lab' | 'revision_pack' | 'bac_practice' | 'mind_map';

export type FeatureKey = 'profile' | 'tutor' | 'track' | 'peers' | 'participate' | 'mistakePractice' | 'sampleQuiz' | 'personalQuiz' | 'host' | 'duel' | 'interactiveLab' | 'revisionDemo' | 'revisionPack' | 'bacPractice' | 'mindMap';

export interface PlanFeature {
  tier: StudentPlan;
  title: MessageDescriptor;
  detail: MessageDescriptor;
}

/** The activities of docs/business-model.md, "Proposed student plans". Pro includes every Free activity. */
export const FEATURES: Record<FeatureKey, PlanFeature> = {
  profile: {
    tier: 'free',
    title: msg`Préparer mes révisions`,
    detail: msg`Diagnostic, programme de départ et préférences de langue et de présentation.`,
  },
  tutor: {
    tier: 'free',
    title: msg`Comprendre avec Nova`,
    detail: msg`Questions de cours, sources disponibles, exercices guidés, indices et corrections.`,
  },
  track: {
    tier: 'free',
    title: msg`Suivre ma progression`,
    detail: msg`Carte des chapitres, erreurs repérées, minuteur et historique de révision.`,
  },
  peers: {
    tier: 'free',
    title: msg`Réviser avec mes amis`,
    detail: msg`Création de salles, invitations, discussions et vérification privée des explications.`,
  },
  participate: {
    tier: 'free',
    title: msg`Participer à une séance Nova`,
    detail: msg`Dans une salle animée par un membre Pro : manches en groupe, quiz de la salle, notes partagées et Nova sur demande.`,
  },
  mistakePractice: {
    tier: 'pro',
    title: msg`Retravailler une erreur`,
    detail: msg`Depuis une erreur repérée, lancer un exercice guidé sur la notion correspondante.`,
  },
  sampleQuiz: {
    tier: 'free',
    title: msg`Quiz d’exemple`,
    detail: msg`Question sur la dérivation avec correction, à refaire à tout moment.`,
  },
  personalQuiz: {
    tier: 'pro',
    title: msg`Me tester sur un chapitre`,
    detail: msg`Choisir un chapitre de maths et obtenir un quiz personnel avec correction si les sources sont disponibles.`,
  },
  host: {
    tier: 'pro',
    title: msg`Animer une séance avec Nova`,
    detail: msg`Choisir le chapitre et guider le groupe de l’explication au quiz, avec les relances et les notes de Nova.`,
  },
  duel: {
    tier: 'pro',
    title: msg`Duel Exam`,
    detail: msg`Passer la même épreuve chronométrée qu’un autre membre Pro de la salle et recevoir un résultat immédiat.`,
  },
  interactiveLab: {
    tier: 'pro',
    title: msg`Labo interactif`,
    detail: msg`Manipuler des modèles de maths ou comparer des situations dans chaque cours de révision.`,
  },
  mindMap: {
    tier: 'pro',
    title: msg`Générer une carte mentale`,
    detail: msg`Explore les notions de cinq chapitres du bac Sciences expérimentales.`,
  },
  revisionDemo: {
    tier: 'free',
    title: msg`Fiche d’exemple`,
    detail: msg`Une carte mémoire pour réviser la dérivée de la fonction carré.`,
  },
  revisionPack: {
    tier: 'pro',
    title: msg`Fiches de révision Nova`,
    detail: msg`Une fiche citée et trois cartes de rappel sur la dérivabilité, en pilote pour le bac Sciences expérimentales. Gratuit : une carte de rappel d’exemple.`,
  },
  bacPractice: {
    tier: 'pro',
    title: msg`Entraînement Bac chronométré`,
    detail: msg`Cinq questions de dérivabilité en dix minutes, avec le score et les corrections détaillées.`,
  },
};

/** Free card bullets, then Pro card bullets (Pro adds to Free). */
export const FREE_HIGHLIGHTS: readonly MessageDescriptor[] = [
  msg`Questions de cours et exercices guidés`,
  msg`Suivi des chapitres et du temps de révision`,
  msg`Salles d’étude, séances Nova des salles Pro et quiz d’exemple`,
];
export const PRO_HIGHLIGHTS: readonly FeatureKey[] = ['personalQuiz', 'mistakePractice', 'interactiveLab', 'bacPractice', 'host'];

export const isProRequired = (error: unknown): boolean => (error as Partial<ApiError> | null)?.code === 'pro_required';

/** `unknown` until the profile read lands: gate on the server's answer, not on a guess. */
export const planOf = (profile: {student_plan?: string} | undefined): StudentPlan | null =>
  !profile ? null : profile.student_plan === 'pro' ? 'pro' : 'free';
