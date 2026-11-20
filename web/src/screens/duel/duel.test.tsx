import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {App} from '../../app/App';
import {createQueryClient} from '../../app/queryClient';
import {appRoutes} from '../../app/router';
import {createSession} from '../../app/session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes} from '../../app/testing';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);
afterEach(() => sessionStorage.clear());

const ROOM = '3f2b8c1e-9a4d-4e7f-8b6a-1c2d3e4f5a6b';
const DUEL = '8a1f0c2e-5b7d-4c3a-9e6f-2d4b6a8c0e1f';
const Q1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

const player = (slot: 1 | 2, pseudo: string, extra = {}) => ({slot, pseudo, ready: true, answered_count: 0, submission_state: 'open', ...extra});

const running = () => {
  const now = Date.now();
  return {
    duel_id: DUEL, blueprint_id: 'derivabilite-fr-v1', topic: 'derivabilite', language: 'fr', status: 'running', version: 4,
    server_now: new Date(now).toISOString(), invite_expires_at: new Date(now + 60_000).toISOString(), ready_expires_at: null,
    starts_at: new Date(now - 5000).toISOString(), deadline_at: new Date(now + 600_000).toISOString(), my_slot: 1,
    players: [player(1, 'eleve01'), player(2, 'yasmine07', {answered_count: 1})],
  };
};

function renderApp(route: string, plan: 'free' | 'pro') {
  const calls: {method: string; path: string; body?: unknown; key?: string | null}[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    const path = url.slice(4);
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    calls.push({method, path, body: init.body ? JSON.parse(String(init.body)) : undefined, key: headers.get('Idempotency-Key')});
    if (path === '/auth/me') return Response.json({pseudo: 'eleve01'});
    if (path === '/me/profile') return Response.json({reply_language: 'fr', student_plan: plan});
    if (path === '/topics') return Response.json({topics: [{slug: 'derivabilite', label: 'Dérivabilité', prerequisites: []}], subtopics: []});
    if (path.endsWith('/blueprints')) {
      return Response.json([{id: 'derivabilite-fr-v1', topic: 'derivabilite', language: 'fr', duration_seconds: 1200, item_count: 8}]);
    }
    if (path === `/groups/rooms/${ROOM}/duels`) return Response.json({items: []});
    if (path === `/groups/rooms/${ROOM}/duels/${DUEL}`) return Response.json(running());
    if (path.endsWith('/exam')) {
      return Response.json({
        exam_id: 'e1', language: 'fr',
        questions: [{id: Q1, kind: 'choice', prompt: 'Dérivée de $x^2$ ?', choices: [{id: 'c1', text: '$2x$'}, {id: 'c2', text: '$x$'}], points: 2}],
      });
    }
    if (path.endsWith('/attempt')) return Response.json({attempt_id: 'a1', revision: 0, answers: {}, submitted_at: null});
    if (method === 'PUT' && path.includes('/attempt/answers/')) return Response.json({revision: 1, answered_count: 1, saved_at: new Date().toISOString()});
    return Response.json({});
  };
  const session = createSession({fetchImpl, storage: memoryStorage('t1')});
  const router = createMemoryRouter(appRoutes, {initialEntries: [route]});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  return {calls};
}

describe('duel screens', () => {
  it('explains that Duel Exam needs Pro on the Free plan and does not call the duel endpoints', async () => {
    const {calls} = renderApp(`/salle/${ROOM}/duel`, 'free');
    expect(await screen.findByText(/Réservé à l’offre Pro/)).toBeTruthy();
    expect(calls.some(call => call.path.includes('/duels'))).toBe(false);
  });

  it('lists the exams of the room with their language, size and duration', async () => {
    renderApp(`/salle/${ROOM}/duel`, 'pro');
    expect(await screen.findByText(/8 questions · 20 min/)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Créer le duel'})).toBeTruthy();
  });

  it('saves a chosen answer with the draft revision and an idempotency key, and shows it as saved', async () => {
    const {calls} = renderApp(`/salle/${ROOM}/duel/${DUEL}`, 'pro');
    fireEvent.click(await screen.findByRole('radio', {name: /2x/}, {timeout: 4000}));
    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    const save = calls.find(call => call.method === 'PUT')!;
    expect(save.path).toBe(`/groups/rooms/${ROOM}/duels/${DUEL}/attempt/answers/${Q1}`);
    expect(save.body).toEqual({expected_revision: 0, answer: {choice_id: 'c1'}});
    expect(save.key).toBeTruthy();
    expect(await screen.findByText(/Tout est enregistré/)).toBeTruthy();
  }, 15_000);
});
