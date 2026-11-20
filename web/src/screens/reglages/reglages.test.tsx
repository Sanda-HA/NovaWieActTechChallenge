import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {App} from '../../app/App';
import {createQueryClient} from '../../app/queryClient';
import {appRoutes} from '../../app/router';
import {createSession} from '../../app/session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes} from '../../app/testing';
import {setLocale} from '../../lib/i18n-store';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);

// jsdom has no modal dialogs; AlertDialog only needs the open state to toggle.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => act(() => setLocale('fr')));

interface Call {
  method: string;
  path: string;
  body: unknown;
}

function renderReglages(profile: Record<string, unknown> = {reply_language: 'fr', level: 'beginner'}) {
  const calls: Call[] = [];
  let stored = profile;
  const fetchImpl = async (url: string, init: RequestInit) => {
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
    const call = {method: init.method ?? 'GET', path: url.slice(4), body};
    calls.push(call);
    if (call.path === '/auth/me' && call.method === 'GET') return Response.json({pseudo: 'eleve01'});
    if (call.path === '/auth/me' && call.method === 'DELETE') return new Response(null, {status: 204});
    if (call.path === '/me/profile' && call.method === 'PUT') stored = {...stored, ...body};
    if (call.path === '/me/profile') return Response.json(stored);
    return Response.json({in_progress: false, planned_end: null});
  };
  const session = createSession({fetchImpl, storage: memoryStorage('t1')});
  const router = createMemoryRouter(appRoutes, {initialEntries: ['/reglages']});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  return {calls, router};
}

const profileReads = (calls: Call[]) => calls.filter(call => call.method === 'GET' && call.path === '/me/profile').length;

describe('Réglages', () => {
  it('saving PUTs the profile, then refetches it so other screens see the change', async () => {
    const {calls} = renderReglages();
    const city = await screen.findByRole('textbox', {name: /^Ville/});
    fireEvent.change(city, {target: {value: 'Sfax'}});
    const before = profileReads(calls);
    fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));
    await waitFor(() => expect(calls.some(call => call.method === 'PUT' && call.path === '/me/profile')).toBe(true));
    expect(calls.find(call => call.method === 'PUT')?.body).toMatchObject({city: 'Sfax', reply_language: 'fr'});
    await waitFor(() => expect(profileReads(calls)).toBeGreaterThan(before));
  });

  it('switches the interface to Arabic for an Arabic reply language and can save it', async () => {
    const {calls} = renderReglages({reply_language: 'ar'});
    const languages = await screen.findByRole('radiogroup', {name: 'لغة الإجابات'});
    expect((within(languages).getByRole('radio', {name: /العربية/}) as HTMLInputElement).checked).toBe(true);
    expect(document.documentElement.dir).toBe('rtl');
    fireEvent.click(screen.getByRole('button', {name: 'حفظ'}));
    await waitFor(() => expect(calls.find(call => call.method === 'PUT')?.body).toMatchObject({reply_language: 'ar'}));
  });

  it('delete stays disabled until the pseudo is typed exactly, then confirms before DELETE /auth/me', async () => {
    const {calls, router} = renderReglages();
    const confirm = await screen.findByRole('textbox', {name: 'Confirme ton pseudo'});
    const remove = screen.getByRole('button', {name: 'Supprimer mon compte'});
    expect(remove.hasAttribute('disabled') || remove.getAttribute('aria-disabled') === 'true').toBe(true);

    fireEvent.change(confirm, {target: {value: 'eleve0'}});
    expect(remove.hasAttribute('disabled') || remove.getAttribute('aria-disabled') === 'true').toBe(true);
    expect(screen.getByText('Recopie exactement ton pseudo.')).toBeTruthy();

    fireEvent.change(confirm, {target: {value: 'eleve01'}});
    await waitFor(() => expect(remove.hasAttribute('disabled') || remove.getAttribute('aria-disabled') === 'true').toBe(false));
    fireEvent.click(remove);
    expect(calls.some(call => call.method === 'DELETE')).toBe(false);

    fireEvent.click(await screen.findByRole('button', {name: 'Supprimer définitivement'}));
    await waitFor(() => expect(calls.some(call => call.method === 'DELETE' && call.path === '/auth/me')).toBe(true));
    await waitFor(() => expect(router.state.location.pathname).toBe('/compte'));
  });
});
