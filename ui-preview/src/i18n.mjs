import {english} from './locale-en.mjs';

const listeners = new Set();
const normalize = text => text.replace(/[\s\u00a0\u202f]+/gu, ' ').trim();
const catalog = new Map(Object.entries(english).map(([key,value]) => [normalize(key),value]));
let locale = 'fr';
try { if (globalThis.localStorage?.getItem('ednova-locale') === 'en') locale = 'en'; } catch {}

export const getLocale = () => locale;
export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(value) {
  const next = value === 'en' ? 'en' : 'fr';
  if (globalThis.document) document.documentElement.lang = next;
  if (next === locale) return;
  locale = next;
  try { globalThis.localStorage?.setItem('ednova-locale',next); } catch {}
  for (const listener of listeners) listener();
}

export function translate(value) {
  if (locale !== 'en' || typeof value !== 'string') return value;
  const key = normalize(value);
  const translated = catalog.get(key);
  if (translated !== undefined) return value.match(/^\s*/u)[0] + translated + value.match(/\s*$/u)[0];
  for (const [prefix, replacement] of [
    ['Quelle explication préfères-tu pour ', 'Which explanation do you prefer for '],
    ['Réviser : ', 'Review: '], ['Présentation : ', 'Presentation: '],
    ['Salle ouverte : ', 'Room opened: '], ['Membres (', 'Members ('],
    ['Cette semaine : ', 'This week: '],
  ]) {
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length);
      return replacement + (prefix === 'Salle ouverte : ' ? rest : translate(rest));
    }
  }
  const score = key.match(/^(\d+) sur 3 pour les questions sur les méthodes de révision\.$/u);
  if (score) return score[1] + ' out of 3 on study methods.';
  const stage = key.match(/^sur (\d+)$/u);
  if (stage) return ' of ' + stage[1];
  const streak = key.match(/^Série : (\d+) jours? de suite$/u);
  if (streak) return 'Streak: ' + streak[1] + (streak[1] === '1' ? ' day' : ' days');
  const retry = key.match(/^Le tuteur est occupé\. Réessaie dans (\d+) s\.$/u);
  if (retry) return 'The tutor is busy. Try again in ' + retry[1] + ' s.';
  const hints = key.match(/^Résolu après (\d+) indices? sur (\d+)$/u);
  if (hints) return 'Solved after ' + hints[1] + ' of ' + hints[2] + ' hints';
  const ladder = key.match(/^Échelle d’indices : (.+)$/u);
  if (ladder) return 'Hint ladder: ' + translate(ladder[1]);
  return value;
}

const textProps = ['aria-label','title','label','hint','placeholder','description','shortLabel','error',
  'question','chapter','greeting','subtitle','aiLabel','sub','tag','level','summary','style','topic','when','task','tool','reason'];
const structuredProps = ['items','footerItems','choices','topics','lastSession','nextStep','weakest','result'];
function translateFields(props) {
  if (!props || typeof props !== 'object' || props.translate === 'no') return props;
  const copy = {...props};
  for (const key of textProps) {
    if (typeof copy[key] === 'string') copy[key] = translate(copy[key]);
  }
  if (typeof copy.name === 'string') copy.name = translate(copy.name);
  for (const key of structuredProps) {
    const value = copy[key];
    if (Array.isArray(value)) copy[key] = value.map(translateFields);
    else if (value && typeof value === 'object') copy[key] = translateFields(value);
  }
  return copy;
}

export function localizedReact(React) {
  return {...React, createElement(type,props,...children) {
    if (locale !== 'en' || props?.translate === 'no' || type === globalThis.EdNova?.MathText) {
      return React.createElement(type,props,...children);
    }
    // Fragment text includes the raw pieces of user messages and AI answers from MathText.
    const rendered = type === React.Fragment ? children : children.map(translate);
    return React.createElement(type,translateFields(props),...rendered);
  }};
}
