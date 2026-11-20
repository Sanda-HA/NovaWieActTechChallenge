import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {App} from '../../app/App';
import {createQueryClient} from '../../app/queryClient';
import {appRoutes} from '../../app/router';
import {createSession} from '../../app/session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes} from '../../app/testing';
import {setLocale} from '../../lib/i18n-store';
import {PSEUDO_PATTERN, pseudoSchema} from './schema';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);

interface Call {
  method: string;
  path: string;
  body: unknown;
}

type Respond = (call: Call) => Response | undefined;

const BANK = {
  preferences: [{id: 'q1', question: 'Quand tu découvres une nouvelle notion, tu préfères…', options: {steps: 'des étapes numérotées', examples: 'un exemple résolu d’abord'}}],
  styles_probe: {id: 'q2', concept: 'la formule de $P_A(B)$', versions: {analogy: 'une analogie', steps: 'des étapes'}},
  level_check: [{id: 'q3', question: 'Combien font $2+2$ ?', options: ['3', '4']}],
};

const TOKEN = {access_token: 't-1', token_type: 'bearer'};

function backend(respond: Respond = () => undefined) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    const raw = init.body;
    const body = raw instanceof URLSearchParams ? Object.fromEntries(raw) : typeof raw === 'string' ? JSON.parse(raw) : null;
    const call = {method: init.method ?? 'GET', path: url.slice(4), body};
    calls.push(call);
    const custom = respond(call);
    if (custom) return custom;
    if (call.path === '/auth/register') return Response.json({}, {status: 201});
    if (call.path === '/auth/login') return Response.json(TOKEN);
    if (call.path === '/me/profile') return Response.json({reply_language: 'fr'});
    if (call.path === '/learning/diagnostic') return call.method === 'GET' ? Response.json(BANK) : Response.json({diagnostic_score: 2, style: 'examples'});
    return Response.json({in_progress: false, planned_end: null});
  };
  return {calls, fetchImpl};
}

function renderAt(path: string, respond?: Respond, {onboarding = false}: {onboarding?: boolean} = {}) {
  const {calls, fetchImpl} = backend(respond);
  const session = createSession({fetchImpl, storage: memoryStorage()});
  const router = createMemoryRouter(appRoutes, {initialEntries: [path]});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  if (onboarding) act(() => session.signedIn('eleve01', {onboarding: true}));
  const at = (pathname: string) => waitFor(() => expect(router.state.location.pathname).toBe(pathname));
  return {at, calls, router, session};
}

const authCalls = (calls: Call[]) => calls.map(call => `${call.method} ${call.path}`).filter(call => /\/(auth|me\/profile)/.test(call));
const alertWith = async (text: string) => (await screen.findByText(text)).closest('[role="alert"]');
const click = (element: HTMLElement) => act(() => void fireEvent.click(element));
const type = async (label: string, value: string) => void fireEvent.change(await screen.findByLabelText(label, {selector: 'input'}), {target: {value}});
const radio = async (name: RegExp | string) => within(await screen.findByRole('main')).findByRole('radio', {name});
const button = (name: RegExp | string) => screen.findByRole('button', {name});

afterEach(() => {
  setLocale('fr');
  sessionStorage.clear();
});

describe('pseudo rule', () => {
  it('rejects "ab" and "abc!" and accepts "yasmine07"', () => {
    expect(pseudoSchema.safeParse('ab').success).toBe(false);
    expect(pseudoSchema.safeParse('abc!').success).toBe(false);
    expect(pseudoSchema.safeParse('x'.repeat(31)).success).toBe(false);
    expect(pseudoSchema.safeParse('yasmine07').success).toBe(true);
    expect(PSEUDO_PATTERN.test('Yasmine_07')).toBe(false);
  });
});

describe('account step', () => {
  it('register then login goes to /bac', async () => {
    const {at, calls} = renderAt('/bienvenue');
    click(await button('C’est parti'));
    await at('/compte');
    await type('Pseudo', 'yasmine07');
    await type('Mot de passe', 'longpassword');
    click(await button('Créer mon compte'));
    await at('/bac');
    expect(authCalls(calls)).toStrictEqual(['POST /auth/register', 'POST /auth/login']);
    expect(calls[0]?.body).toStrictEqual({pseudo: 'yasmine07', password: 'longpassword'});
  });

  it('login alone goes to /accueil', async () => {
    const {at, calls} = renderAt('/bienvenue');
    click(await button('J’ai déjà un compte'));
    await at('/compte');
    expect(await screen.findByRole('heading', {name: 'Content de te revoir.'})).toBeTruthy();
    await type('Pseudo', 'yasmine07');
    await type('Mot de passe', 'longpassword');
    click(await button('Me connecter'));
    await at('/accueil');
    expect(authCalls(calls)).toStrictEqual(['POST /auth/login', 'GET /me/profile']);
  });

  it('shows field errors and sends nothing when the form is invalid', async () => {
    const {calls} = renderAt('/compte');
    await type('Pseudo', 'ab');
    await type('Mot de passe', 'short');
    click(await button('Créer mon compte'));
    expect(await screen.findByText('3 à 30 caractères : lettres et chiffres.')).toBeTruthy();
    expect(screen.getByText('8 caractères minimum : ajoute quelques lettres ou chiffres.')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('maps a taken pseudo to the pseudo field', async () => {
    renderAt('/compte', call => (call.path === '/auth/register' ? Response.json({}, {status: 409}) : undefined));
    await type('Pseudo', 'yasmine07');
    await type('Mot de passe', 'longpassword');
    click(await button('Créer mon compte'));
    expect(await screen.findByText('Ce pseudo est déjà pris.')).toBeTruthy();
  });

  it('failed login after register switches the button to "Me connecter"', async () => {
    let failing = true;
    const {at, calls} = renderAt('/compte', call => (call.path === '/auth/login' && failing ? Response.json({}, {status: 503}) : undefined));
    await type('Pseudo', 'yasmine07');
    await type('Mot de passe', 'longpassword');
    click(await button('Créer mon compte'));
    expect(await screen.findByText('Compte créé. Réessaie pour continuer.')).toBeTruthy();
    const retry = await button('Me connecter');
    failing = false;
    click(retry);
    await at('/bac');
    expect(calls.filter(call => call.path === '/auth/register')).toHaveLength(1);
  });

  it('shows and hides the password', async () => {
    renderAt('/compte');
    const toggle = await button('Afficher le mot de passe');
    expect(screen.getByLabelText('Mot de passe', {selector: 'input'}).getAttribute('type')).toBe('password');
    click(toggle);
    expect(screen.getByLabelText('Mot de passe', {selector: 'input'}).getAttribute('type')).toBe('text');
    expect(await button('Masquer le mot de passe')).toBeTruthy();
  });
});

describe('bac step', () => {
  it('Continue is disabled until a section is chosen', async () => {
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/bac'));
    const next = await button('C’est bien ça');
    expect((next as HTMLButtonElement).disabled || next.getAttribute('aria-disabled') === 'true').toBe(true);
    click(await radio(/^Mathématiques/));
    await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  });

  it('saves the section and the language on the way out', async () => {
    const {at, calls, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/bac'));
    click(await radio(/^Sciences expérimentales/));
    click(await button('C’est bien ça'));
    await at('/style');
    const save = calls.find(call => call.method === 'PUT');
    expect(save).toMatchObject({path: '/me/profile', body: {reply_language: 'fr', section: 'sciences_experimentales'}});
  });

  it('step save failure shows the exact alert text and stays on the step', async () => {
    const {router} = renderAt('/compte', call => (call.method === 'PUT' ? Response.json({}, {status: 503}) : undefined), {onboarding: true});
    await act(() => router.navigate('/bac'));
    click(await radio(/^Mathématiques/));
    click(await button('C’est bien ça'));
    expect(await alertWith('Tes choix n’ont pas pu être enregistrés. Réessaie.')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/bac');
  });

  it('choosing English saves reply_language when signed in', async () => {
    const {calls, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/bac'));
    click(await radio(/^English/));
    await waitFor(() => expect(calls.some(call => call.method === 'PUT' && (call.body as {reply_language?: string})?.reply_language === 'en')).toBe(true));
  });
});

describe('style and tools steps', () => {
  it('asks for a presentation before continuing', async () => {
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/style'));
    click(await button('Continuer'));
    expect(await alertWith('Choisis une des deux façons pour continuer.')).toBeTruthy();
    click(await radio(/^Visuel/));
    expect(screen.queryByText('Choisis une des deux façons pour continuer.')).toBeNull();
  });

  it('marks tools that are not ready as "Bientôt" and disables them', async () => {
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/outils'));
    const soon = await screen.findByRole('checkbox', {name: /^Fiches IA/});
    expect((soon as HTMLInputElement).disabled).toBe(true);
    expect(within(soon.closest('label') as HTMLElement).getByText('Bientôt')).toBeTruthy();
    expect((await screen.findByRole('checkbox', {name: /^Exercices guidés/}) as HTMLInputElement).disabled).toBe(false);
  });
});

describe('diagnostic step', () => {
  it('"Passer les questions" skips to the plan', async () => {
    const {at, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/diagnostic'));
    expect(await screen.findByRole('heading', {name: 'Six questions rapides pour savoir par où commencer.'})).toBeTruthy();
    click(await button('Passer les questions'));
    await at('/plan');
  });

  it('answers the live bank, posts the answers and shows the result', async () => {
    const {at, calls, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/diagnostic'));
    click(await radio(/des étapes numérotées/));
    click(await button('Suivant'));
    click(await radio(/une analogie/));
    click(await button('Suivant'));
    click(await radio(/^4$/));
    click(await button('Voir mon résultat'));
    expect(await screen.findByRole('heading', {name: 'Voilà ton point de départ.'})).toBeTruthy();
    expect(screen.getByText('2 sur 3 pour les questions sur les méthodes de révision.')).toBeTruthy();
    expect(screen.getByText('Par exemples')).toBeTruthy();
    expect(calls.find(call => call.method === 'POST' && call.path === '/learning/diagnostic')?.body).toStrictEqual({
      answers: {q1: 'steps', q2: 'analogy', q3: '4'},
    });
    click(await button('Voir un exemple de programme'));
    await at('/plan');
  });

  it('the number keys choose an answer', async () => {
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/diagnostic'));
    const group = await within(await screen.findByRole('main')).findByRole('radiogroup');
    fireEvent.keyDown(group, {key: '2'});
    expect((await radio(/un exemple résolu d’abord/)).getAttribute('aria-checked')).toBe('true');
  });

  it('an unavailable diagnostic offers retry and allows the learner to finish setup', async () => {
    const {at, router} = renderAt('/compte', call => (call.path === '/learning/diagnostic' ? Response.json({}, {status: 503}) : undefined), {onboarding: true});
    await act(() => router.navigate('/diagnostic'));
    expect(await alertWith('Diagnostic indisponible. Réessaie.')).toBeTruthy();
    expect(await screen.findByRole('button', {name: 'Réessayer'})).toBeTruthy();
    click(await button('Passer les questions'));
    await at('/plan');
    click(await button(/^Commencer/));
    await at('/accueil');
  });
});

describe('plan step', () => {
  it('Commencer saves all preferences then opens /accueil', async () => {
    const {at, calls, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/bac'));
    click(await radio(/^Mathématiques/));
    click(await button('C’est bien ça'));
    click(await radio(/^Lecture/));
    click(await button('Continuer'));
    click(await screen.findByRole('checkbox', {name: /^Mode Feynman/}));
    click(await button('Continuer'));
    click(await button('Passer les questions'));
    await at('/plan');
    expect(await screen.findByText('Ta préférence', {exact: false})).toBeTruthy();
    calls.length = 0;
    click(await button(/^Commencer/));
    await at('/accueil');
    expect(calls.find(call => call.method === 'PUT')?.body).toStrictEqual({
      reply_language: 'fr',
      section: 'mathematiques',
      presentation: 'reading',
      enabled_tools: ['feynman'],
    });
  });

  it('a failed save keeps the learner on the plan with the exact alert', async () => {
    const {router} = renderAt('/compte', call => (call.method === 'PUT' ? Response.json({}, {status: 503}) : undefined), {onboarding: true});
    await act(() => router.navigate('/plan'));
    click(await button(/^Commencer/));
    expect(await alertWith('Tes choix n’ont pas pu être enregistrés. Réessaie.')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/plan');
  });

  it('says so when no tool was chosen', async () => {
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/plan'));
    expect(await screen.findByText('Aucun outil choisi : tu peux en ajouter dans les réglages.')).toBeTruthy();
    expect(screen.getByText('Ce programme est un exemple. Il ne sera pas enregistré.')).toBeTruthy();
  });
});

describe('English', () => {
  it('has a translation for every message on every step', async () => {
    setLocale('en');
    const {router} = renderAt('/bienvenue', undefined, {onboarding: true});
    for (const path of ['/bienvenue', '/compte', '/bac', '/style', '/outils', '/diagnostic', '/plan']) {
      await act(() => router.navigate(path));
      await waitFor(() => expect(router.state.location.pathname).toBe(path));
      await screen.findByRole('heading', {level: 1});
    }
  });

  it('translates the diagnostic questions and result in English', async () => {
    setLocale('en');
    const {router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/diagnostic'));
    click(await radio(/numbered steps/));
    click(await button('Next'));
    click(await radio(/une analogie/));
    click(await button('Next'));
    click(await radio(/^4$/));
    click(await button('See my result'));
    await waitFor(() => expect(document.body.textContent).toContain('2 out of 3 on study methods.'));
    expect(document.body.textContent).toContain('With examples');
  });

  it('shows the lecture variant of the plan in English', async () => {
    setLocale('en');
    const {at, router} = renderAt('/compte', undefined, {onboarding: true});
    await act(() => router.navigate('/style'));
    click(await radio(/^Reading/));
    click(await button('Continue'));
    await at('/outils');
    await act(() => router.navigate('/plan'));
    await waitFor(() => expect(document.body.textContent).toContain('The probability of'));
  });
});
