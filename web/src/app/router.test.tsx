import {act, render, screen, waitFor, within} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {App} from './App';
import {createQueryClient} from './queryClient';
import {appRoutes, captureInvite} from './router';
import {createSession} from './session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes, signedInBackend, stubFetch} from './testing';

const NAV_ORDER = ['Accueil', 'Tuteur', 'Carte des chapitres', 'Temps d’étude', 'Salle d’étude', 'Réglages'];

function renderApp(path: string, {token = null as string | null, respond = signedInBackend()} = {}) {
  const storage = memoryStorage(token);
  const {calls, fetchImpl} = stubFetch((method, pathname) => respond(method, pathname));
  const session = createSession({fetchImpl, storage});
  const router = createMemoryRouter(appRoutes, {initialEntries: [path]});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  const at = (pathname: string) => waitFor(() => expect(router.state.location.pathname).toBe(pathname));
  return {at, calls, router, session, storage};
}

function useWidth(mobile: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mobile && /width\s*<\s*640px/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('route guards', () => {
  it('sends a signed-out learner from /accueil to /compte', async () => {
    const {at} = renderApp('/accueil');
    await at('/compte');
    expect(await screen.findByRole('heading', {name: 'Choisis un pseudo. Pas besoin de ton vrai nom.'})).toBeTruthy();
  });

  it('sends a signed-in learner from an onboarding step to /accueil', async () => {
    const {at} = renderApp('/bac', {token: 't1'});
    await at('/accueil');
    expect(await screen.findByRole('heading', {name: 'Bonjour, eleve01'})).toBeTruthy();
  });

  it('keeps a learner who is still onboarding on the onboarding steps', async () => {
    const {at, router, session} = renderApp('/compte');
    await screen.findByRole('heading', {name: 'Choisis un pseudo. Pas besoin de ton vrai nom.'});
    act(() => session.signedIn('eleve01', {onboarding: true}));
    await act(() => router.navigate('/bac'));
    await at('/bac');
  });

  it('shows the welcome screen at / when signed out', async () => {
    const {at} = renderApp('/');
    await at('/bienvenue');
    expect(await screen.findByRole('heading', {name: 'Salut, moi c’est Nova.'})).toBeTruthy();
  });

  it('shows a not-found page with a way back, instead of redirecting', async () => {
    const {router} = renderApp('/nulle-part');
    expect(await screen.findByRole('heading', {name: 'Page introuvable'})).toBeTruthy();
    expect(router.state.location.pathname).toBe('/nulle-part');
    await waitFor(() => expect(document.title).toBe('Page introuvable · Nova'));
    expect(screen.getByRole('link', {name: 'Retour à la bienvenue'}).getAttribute('href')).toBe('/bienvenue');
  });

  it('points the not-found page at Accueil when signed in', async () => {
    renderApp('/nulle-part', {token: 't1'});
    expect((await screen.findByRole('link', {name: 'Retour à l’accueil'})).getAttribute('href')).toBe('/accueil');
  });

  it('shows a retry state instead of signing out when the backend is down', async () => {
    let down = true;
    const {at, storage} = renderApp('/accueil', {
      token: 't1',
      respond: (method, path) =>
        down ? Response.json({detail: {error: 'backend_unavailable'}}, {status: 503}) : signedInBackend()(method, path),
    });
    const retry = await screen.findByRole('button', {name: 'Réessayer'});
    expect(screen.getByText('Chargement indisponible. Réessaie.')).toBeTruthy();
    expect(storage.items.get('ednova-token')).toBe('t1');
    down = false;
    act(() => retry.click());
    await at('/accueil');
    expect(await screen.findByRole('heading', {name: 'Bonjour, eleve01'})).toBeTruthy();
  });
});

describe('invite links', () => {
  it('captures the code once and lands on /salle after sign-in', async () => {
    window.history.replaceState(null, '', '/#rejoindre=ab12cd');
    captureInvite();
    expect(sessionStorage.getItem('ednova-join-code')).toBe('AB12CD');
    expect(window.location.hash).toBe('');
    sessionStorage.setItem('ednova-join-code', 'AB12CD');
    captureInvite();
    expect(window.location.pathname + window.location.hash).toBe('/');

    const {at, router, session} = renderApp('/');
    await at('/bienvenue');
    act(() => session.signedIn('eleve01'));
    await at('/salle');
    await act(() => router.navigate('/accueil'));
    await at('/accueil');
    await screen.findByRole('heading', {name: 'Bonjour, eleve01'});
    expect(router.state.location.pathname).toBe('/accueil');
  });
});

describe('session expiry', () => {
  it('a 401 from any call lands on /compte with the token cleared and no reload', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', {...window.location, reload});
    let expired = false;
    const {at, session, storage} = renderApp('/tuteur', {
      token: 't1',
      respond: (method, path) => (expired ? Response.json({}, {status: 401}) : signedInBackend()(method, path)),
    });
    await screen.findByRole('heading', {name: 'Tuteur'});
    expired = true;
    await act(() => session.api.request('GET', '/me/profile').catch(() => {}));
    await at('/compte');
    expect(storage.items.has('ednova-token')).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('navigation', () => {
  it('shows the full “Temps d’étude” label on desktop', async () => {
    useWidth(false);
    renderApp('/accueil', {token: 't1'});
    const nav = await screen.findByRole('navigation', {name: 'Navigation principale'});
    expect(within(nav).getByText('Temps d’étude')).toBeTruthy();
  });

  it('shows the short “Temps” label on a phone', async () => {
    useWidth(true);
    renderApp('/accueil', {token: 't1'});
    const nav = await screen.findByRole('navigation', {name: 'Navigation principale'});
    expect(within(nav).getByText('Temps')).toBeTruthy();
    expect(within(nav).queryByText('Temps d’étude')).toBeNull();
    expect(within(nav).getByRole('link', {name: 'Temps d’étude'})).toBeTruthy();
  });

  it.each([false, true])('every item is a tab stop in order and the current one is marked (phone: %s)', async mobile => {
    useWidth(mobile);
    renderApp('/seances', {token: 't1'});
    const nav = await screen.findByRole('navigation', {name: 'Navigation principale'});
    await screen.findByRole('heading', {name: 'Temps d’étude'});
    const links = within(nav).getAllByRole('link');
    expect(links.map(link => link.getAttribute('aria-label') ?? link.textContent?.trim())).toStrictEqual(NAV_ORDER);
    for (const link of links) {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('tabindex')).not.toBe('-1');
      link.focus();
      expect(document.activeElement).toBe(link);
      expect(link.getAttribute('aria-current')).toBe(link === links[3] ? 'page' : null);
    }
  });
});
