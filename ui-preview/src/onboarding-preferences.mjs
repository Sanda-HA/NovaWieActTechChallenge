export const studyTools = {
  guided: 'Exercices guidés',
  feynman: 'Vérifier une explication',
};

export function saveOnboardingPreferences(api, {lang, style, tools}, step) {
  const preferences = {
    reply_language: lang,
    presentation: style === 'visuel' ? 'visual' : style === 'lecture' ? 'reading' : null,
    enabled_tools: Object.keys(studyTools).filter(tool => tools.has(tool)),
  };
  const field = {bac:'reply_language',style:'presentation',outils:'enabled_tools'}[step];
  return api.request('PUT', '/me/profile', {
    json: field ? {[field]:preferences[field]} : preferences,
  });
}
