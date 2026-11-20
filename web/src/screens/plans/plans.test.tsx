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

const SAMPLE = {
  quiz_id: '33333333-3333-4333-8333-333333333333',
  topic: 'derivabilite',
  questions: [{id: 'sample_derivative', question: 'Quelle est la dérivée de x ?', choices: ['a', 'b', 'c', 'd']}],
};

function renderApp(route: string, initial: {student_plan: 'free' | 'pro'; pro_requested?: boolean}) {
  const calls: string[] = [];
  let profile = {reply_language: 'fr', pro_requested: false, ...initial};
  const fetchImpl = async (url: string, init: RequestInit) => {
    const path = url.slice(4);
    const method = init.method ?? 'GET';
    calls.push(`${method} ${path}`);
    if (path === '/auth/me') return Response.json({pseudo: 'eleve01'});
    if (path === '/me/profile') return Response.json(profile);
    if (path === '/me/pro-request' && method === 'DELETE') {
      profile = {...profile, pro_requested: false};
      return new Response(null, {status: 204});
    }
    if (path === '/me/pro-request') {
      profile = {...profile, pro_requested: true};
      return Response.json(profile);
    }
    if (path === '/learning/mistake-practice') return Response.json({detail: {error: 'pro_required', feature: 'mistake_practice'}}, {status: 403});
    if (path === '/learning/sample-quiz') return Response.json(SAMPLE);
    if (path.startsWith('/learning/quiz/') && method === 'GET') {
      return Response.json({detail: {error: 'pro_required', feature: 'personal_quiz'}}, {status: 403});
    }
    if (path === '/topics') return Response.json({topics: [{slug: 'derivabilite', label: 'Dérivabilité', prerequisites: []}], subtopics: []});
    if (path === '/learning/progress') return Response.json({topics: [], subtopics: [], mistakes: [{topic: 'derivabilite', label: 'Dérivabilité', type: 'calculation'}]});
    return Response.json({in_progress: false, planned_end: null});
  };
  const session = createSession({fetchImpl, storage: memoryStorage('t1')});
  const router = createMemoryRouter(appRoutes, {initialEntries: [route]});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  return {calls, setPlan: (plan: 'free' | 'pro') => void (profile = {...profile, student_plan: plan})};
}

describe('plans', () => {
  it('shows the proposed price and queues a Pro request, then shows it as pending', async () => {
    const {calls} = renderApp('/offres', {student_plan: 'free'});
    expect((await screen.findAllByText('15')).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByRole('button', {name: 'Demander l’accès Pro'}));
    expect(await screen.findByText(/Demande Pro enregistrée/)).toBeTruthy();
    expect(calls).toContain('POST /me/pro-request');
    expect(screen.queryByRole('button', {name: 'Demander l’accès Pro'})).toBeNull();
  });

  it('cancels a pending Pro request and offers to request again', async () => {
    const {calls} = renderApp('/offres', {student_plan: 'free', pro_requested: true});
    fireEvent.click(await screen.findByRole('button', {name: 'Annuler ma demande'}));
    expect(await screen.findByRole('button', {name: 'Demander l’accès Pro'})).toBeTruthy();
    expect(calls).toContain('DELETE /me/pro-request');
    expect(screen.queryByText(/Demande Pro enregistrée/)).toBeNull();
  });

  it('locks the chapter quiz and mistake practice on Free but keeps the sample quiz open', async () => {
    renderApp('/carte', {student_plan: 'free'});
    expect(await screen.findByText(/Lancer un exercice depuis une erreur repérée est réservé à l’offre Pro/)).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'S’entraîner'})).toBeNull();
    fireEvent.click(await screen.findByRole('button', {name: 'Essayer le quiz d’exemple'}));
    expect(await screen.findByText('Quelle est la dérivée de x ?')).toBeTruthy();
  });

  it('offers mistake practice on Pro', async () => {
    renderApp('/carte', {student_plan: 'pro'});
    expect(await screen.findByRole('button', {name: 'S’entraîner'})).toBeTruthy();
    expect(screen.queryByText(/réservé à l’offre Pro/)).toBeNull();
  });

  it('refreshes the plan and shows the locked state when a Pro action answers 403 pro_required', async () => {
    const {calls, setPlan} = renderApp('/carte', {student_plan: 'pro'});
    expect(await screen.findByRole('button', {name: 'S’entraîner'})).toBeTruthy();
    // The operator removed Pro while the page was open; the next read returns Free.
    setPlan('free');
    const before = calls.filter(call => call === 'GET /me/profile').length;
    fireEvent.click(await screen.findByRole('button', {name: 'S’entraîner'}));
    await waitFor(() => expect(calls.filter(call => call === 'GET /me/profile').length).toBeGreaterThan(before));
    expect(await screen.findByText(/Lancer un exercice depuis une erreur repérée est réservé à l’offre Pro/)).toBeTruthy();
  });
});
