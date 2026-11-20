import type {Api, OnboardingChoices} from './types';

export const studyTools = {
  guided: 'Exercices guidés',
  feynman: 'Vérifier une explication',
};

const stepFields:Record<string, string[]> = {bac:['reply_language', 'section'], style:['presentation'], outils:['enabled_tools']};

export function saveOnboardingPreferences(api:Api, {lang, section, style, tools}:OnboardingChoices, step?:string) {
  const preferences:Record<string, unknown> = {
    reply_language: lang,
    ...(section ? {section} : {}),
    presentation: style === 'visuel' ? 'visual' : style === 'lecture' ? 'reading' : null,
    enabled_tools: Object.keys(studyTools).filter(tool => tools.has(tool)),
  };
  const fields = step === undefined ? undefined : stepFields[step];
  return api.request('PUT', '/me/profile', {
    json: fields ? Object.fromEntries(fields.filter(field => field in preferences).map(field => [field, preferences[field]]))
      : preferences,
  });
}
