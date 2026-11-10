import {createApi, signIn} from './api.mjs';
import {createLiveScreen} from './live-screens.mjs';
import {saveOnboardingPreferences} from './onboarding-preferences.mjs';
import {createTutorWorkspace} from './tutor-workspace.mjs';
import {getLocale, localizedReact, setLocale, subscribeLocale} from './i18n.mjs';

const bank = [];
const accounts = new WeakMap();
let authenticated = false;
let diagnostic;
let presentation;
let languageSave = Promise.resolve();
function reset() {
  authenticated = false;
  diagnostic = undefined;
  presentation = undefined;
  bank.length = 0;
  api.clear();
  tutor.clear();
  location.replace(location.pathname + '#compte');
  location.reload();
}
const api = createApi({onExpired: reset});
const tutor = createTutorWorkspace(api);

function chooseLanguage(lang) {
  setLocale(lang);
  if (!authenticated) return;
  // Keep rapid toggles in order. The next onboarding step also retries the current choice.
  languageSave = languageSave.then(() => authenticated
    ? api.request('PUT','/me/profile',{json:{reply_language:lang}})
    : undefined).catch(() => {});
}

async function accountSubmit({login, form, onCreated, onError, onSuccess}) {
  const state = accounts.get(form) ?? {created: false, pending: false};
  accounts.set(form, state);
  if (state.pending) return;
  state.pending = true;
  const {username, password} = form.elements;
  try {
    if (!state.signedIn) {
      await signIn(api, {
        login: login || state.created, username: username.value.trim(), password: password.value,
        onCreated() { state.created = true; onCreated(); },
      });
      state.signedIn = true;
    }
    if (!login) {
      const data = await api.request('GET', '/learning/diagnostic');
      const probe = data.styles_probe;
      const choices = options => Object.entries(options).map(([id,label]) => ({id,label}));
      bank.splice(0,bank.length,
        ...data.preferences.map(p => ({...p,choices:choices(p.options)})),
        {id:probe.id,question:'Quelle explication préfères-tu pour ' + probe.concept + ' ?',choices:choices(probe.versions)},
        ...data.level_check.map(p => ({id:p.id,question:p.question,choices:p.options.map(label => ({id:label,label}))})));
    } else {
      const profile = await api.request('GET', '/me/profile');
      setLocale(profile.reply_language);
    }
    password.value = '';
    authenticated = true;
    onSuccess();
  } catch (error) {
    onError(error.status === 409 ? 'Ce pseudo est déjà pris.' : state.created
      ? 'Compte créé. Réessaie pour continuer.' : 'Connexion indisponible. Réessaie.',
      error.status === 409 ? 'pseudo' : 'password');
  } finally {
    state.pending = false;
  }
}

const Screen = createLiveScreen(api, reset, tutor);
window.EdNovaPreview = {
  bank, Screen, screen:'accueil', accountSubmit,
  getLocale, setLocale:chooseLanguage, subscribeLocale,
  finishOnboarding: async choices => {
    await languageSave;
    return saveOnboardingPreferences(api,choices);
  },
  saveOnboardingStep: async (step, choices) => {
    await languageSave;
    return saveOnboardingPreferences(api,choices,step);
  },
  validatePseudo: value => /^[A-Za-z0-9]{3,30}$/.test(value) ? '' : '3 à 30 caractères : lettres et chiffres.',
  route(step) {
    if (!authenticated && !['bienvenue','compte'].includes(step)) return 'compte';
    if (authenticated && !bank.length && ['bac','style','outils','diagnostic','plan'].includes(step)) return 'accueil';
    return step;
  },
  async submitDiagnostic(answers, style) {
    diagnostic = await api.request('POST','/learning/diagnostic',{json:{answers}});
    presentation = style;
    return this.profile();
  },
  profile() {
    const score = diagnostic?.diagnostic_score ?? null;
    const format = {step_by_step:'Par étapes',examples:'Par exemples',visual:'Avec des schémas',analogy:'Par analogies'};
    return {
      formatLabel: (presentation === 'visuel' ? 'Avec des schémas' : presentation === 'lecture' ? 'Par étapes' : format[diagnostic?.style]) ?? 'À découvrir',
      levelLabel: 'Méthodes de révision',
      summary: score === null ? 'Pas encore évalué' : score + ' sur 3 pour les questions sur les méthodes de révision.',
      suggestions: [], plan: [
        {when:'Ce soir',minutes:20,task:'Réviser une notion dans la matière de ton choix',tool:'Tuteur · Exemple'},
        {when:'Demain',minutes:15,task:'Retrouver de mémoire ce que tu as appris',tool:'Révision · Exemple'},
        {when:'Mercredi',minutes:15,task:'Expliquer une notion avec tes propres mots',tool:'Mode Feynman · Exemple'},
      ],
      nextStep: {kind:'review',label:'Choisir une notion à réviser',message:'Aide-moi à choisir une notion à réviser.'},
    };
  },
  restart: reset,
};
window.EdNovaReact = localizedReact(window.React);
setLocale(getLocale());

function loadScript(src) {
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });
}
await loadScript('./src/components.js');
await loadScript('./src/onboarding.js');
