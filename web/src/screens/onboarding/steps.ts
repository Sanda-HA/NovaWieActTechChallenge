import {msg} from '@lingui/core/macro';
import type {MessageDescriptor} from '@lingui/core';
import type {IconName} from '../../ui/icons';

export type StepId = 'compte' | 'bac' | 'style' | 'outils' | 'diagnostic' | 'plan';

export const STEPS: ReadonlyArray<{id: StepId; name: MessageDescriptor}> = [
  {id: 'compte', name: msg`Ton compte`},
  {id: 'bac', name: msg`Ton bac`},
  {id: 'style', name: msg`Ta façon d’apprendre`},
  {id: 'outils', name: msg`Tes outils`},
  {id: 'diagnostic', name: msg`Mini-diagnostic`},
  {id: 'plan', name: msg`Ton plan`},
];

export const stepIndex = (path: string): number => STEPS.findIndex(step => `/${step.id}` === path);

export const SECTIONS: ReadonlyArray<{id: string; title: MessageDescriptor}> = [
  {id: 'mathematiques', title: msg`Mathématiques`},
  {id: 'sciences_experimentales', title: msg`Sciences expérimentales`},
  {id: 'autre', title: msg`Autre section`},
];

export interface Tool {
  id: string;
  title: MessageDescriptor;
  description: MessageDescriptor;
  icon: IconName;
  soon?: true;
}

export const TOOLS: readonly Tool[] = [
  {id: 'guided', title: msg`Exercices guidés`, description: msg`Des indices marche par marche, jamais la réponse toute faite.`, icon: 'stairs'},
  {id: 'feynman', title: msg`Mode Feynman`, description: msg`Tu expliques une notion, je te pose des questions.`, icon: 'chat'},
  {id: 'ai-cards', title: msg`Fiches IA`, description: msg`Des fiches tirées de ton manuel.`, icon: 'copy', soon: true},
  {id: 'own-cards', title: msg`Mes propres fiches`, description: msg`Tes fiches, avec des formules bien écrites.`, icon: 'pen', soon: true},
  {id: 'exams', title: msg`Examens blancs`, description: msg`Des sujets type bac, chronométrés si tu veux.`, icon: 'clock', soon: true},
  {id: 'notes', title: msg`Mes notes`, description: msg`Tes notes de cours au même endroit.`, icon: 'receipt', soon: true},
];

/** Steps whose choices are saved to the profile as the learner moves on (ui-preview's saveOnboardingStep). */
export const SAVED_ON_LEAVING: Partial<Record<StepId, StepId>> = {bac: 'style', style: 'outils', outils: 'diagnostic'};
