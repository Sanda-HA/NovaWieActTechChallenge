import {msg} from '@lingui/core/macro';
import type {MessageDescriptor} from '@lingui/core';
import type {OnboardingChoices} from '../../lib/types';

export interface DiagnosticQuestion {
  id: string;
  question: string;
  choices: ReadonlyArray<{id: string; label: string}>;
}

/** The shape GET /learning/diagnostic answers with. */
export interface DiagnosticData {
  preferences: ReadonlyArray<{id: string; question: string; options: Record<string, string>}>;
  styles_probe: {id: string; concept: string; versions: Record<string, string>};
  level_check: ReadonlyArray<{id: string; question: string; options: readonly string[]}>;
}

export interface DiagnosticResponse {
  diagnostic_score: number | null;
  style?: string;
}

export type DiagnosticOutcome = DiagnosticResponse;

const choicesOf = (options: Record<string, string>) => Object.entries(options).map(([id, label]) => ({id, label}));

/** Preferences, the explanation probe, then the level check: six questions as ui-preview builds them. */
export function toBank(data: DiagnosticData): DiagnosticQuestion[] {
  const {styles_probe: probe} = data;
  return [
    ...data.preferences.map(p => ({id: p.id, question: p.question, choices: choicesOf(p.options)})),
    {id: probe.id, question: `Quelle explication préfères-tu pour ${probe.concept} ?`, choices: choicesOf(probe.versions)},
    ...data.level_check.map(p => ({id: p.id, question: p.question, choices: p.options.map(label => ({id: label, label}))})),
  ];
}

const FORMATS: Record<string, MessageDescriptor> = {
  step_by_step: msg`Par étapes`,
  examples: msg`Par exemples`,
  visual: msg`Avec des schémas`,
  analogy: msg`Par analogies`,
};

/** The learner's own presentation choice wins over what the diagnostic estimated. */
export function formatLabel(style: OnboardingChoices['style'], outcome: DiagnosticOutcome | null): MessageDescriptor {
  if (style === 'visuel') return FORMATS.visual!;
  if (style === 'lecture') return FORMATS.step_by_step!;
  return (outcome?.style ? FORMATS[outcome.style] : undefined) ?? msg`À découvrir`;
}
