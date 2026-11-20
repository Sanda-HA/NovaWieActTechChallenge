import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {App} from '../../app/App';
import {createQueryClient} from '../../app/queryClient';
import {appRoutes} from '../../app/router';
import {createSession} from '../../app/session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes} from '../../app/testing';
import {matchesLabAnswer} from './InteractiveLab';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);
afterEach(() => sessionStorage.clear());

const PACK = {
  topic: 'derivabilite',
  sheet: [{text: 'La dérivée donne la pente.', source: {chunk_id: 'c1', source: 'Manuel', page: 12}}],
  cards: [1, 2, 3].map(n => ({question: `Carte ${n} ?`, answer: `Réponse ${n}`, source: {chunk_id: `k${n}`, source: 'Manuel', page: n}})),
};
const BAC = {
  quiz_id: '44444444-4444-4444-8444-444444444444',
  topic: 'derivabilite',
  duration_seconds: 600,
  questions: [1, 2].map(n => ({id: `b${n}`, question: `Question ${n} ?`, choices: ['a', 'b', 'c', 'd']})),
};
const LAB = {
  topic: 'derivabilite',
  title: 'Tangente et pente',
  instruction: 'Déplace le point.',
  parameter: 'a',
  bounds: [-2, 2, -1, 4],
  equal_axes: false,
  frames: [0, 1, 2].map(value => ({value, answer: value * 2, feedback: 'Pente.', series: [{label: 'f', style: 'line', paths: [[[-2, 4], [2, 4]]]}]})),
};

async function pressWhenReady(name: string) {
  const button = (await screen.findByRole('button', {name})) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

function renderCarte(plan: 'free' | 'pro', initialEntries = ['/carte']) {
  const calls: string[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    const path = url.slice(4);
    const method = init.method ?? 'GET';
    calls.push(`${method} ${path}`);
    if (path === '/auth/me') return Response.json({pseudo: 'eleve01'});
    if (path === '/me/profile') return Response.json({student_plan: plan, pro_requested: false, reply_language: 'fr'});
    if (path === '/topics') return Response.json({topics: [{slug: 'derivabilite', label: 'Dérivabilité', prerequisites: []}], subtopics: []});
    if (path === '/learning/progress') return Response.json({topics: [], subtopics: [], mistakes: []});
    if (path === '/learning/revision-demo/completion') return new Response(null, {status: 204});
    if (path === '/learning/revision-pack/derivabilite') return Response.json(PACK);
    if (path === '/learning/bac-practice/derivabilite') return Response.json(BAC);
    if (path === '/learning/interactive-lab/derivabilite') return Response.json(LAB);
    return Response.json({in_progress: false, planned_end: null});
  };
  const session = createSession({fetchImpl, storage: memoryStorage('study')});
  const router = createMemoryRouter(appRoutes, {initialEntries});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  return {calls, router};
}

describe('study tools on the chapter map', () => {
  it('locks the lab and Bac practice on Free, and records the demo recall card once', async () => {
    const {calls} = renderCarte('free');
    expect(await screen.findByText(/Le labo interactif est réservé à l’offre Pro/)).toBeTruthy();
    expect(screen.getByText(/L’entraînement Bac chronométré est réservé à l’offre Pro/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', {name: 'Essayer une carte'}));
    const card = (await screen.findByText(/Quelle est la dérivée de/)).closest('details') as HTMLDetailsElement;
    for (const open of [true, false, true]) {
      card.open = open;
      fireEvent(card, new Event('toggle'));
    }
    await waitFor(() => expect(calls.filter(call => call === 'POST /learning/revision-demo/completion')).toHaveLength(1));
    expect(calls).not.toContain('POST /learning/revision-pack/derivabilite');
  });

  it('generates the cited sheet and three recall cards on Pro', async () => {
    renderCarte('pro');
    fireEvent.click(await screen.findByRole('button', {name: 'Préparer ma fiche'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Générer ma fiche'}));
    expect(await screen.findByText('La dérivée donne la pente.')).toBeTruthy();
    expect(screen.getAllByText(/^Carte \d \?$/)).toHaveLength(3);
  });

  it('starts timed Bac practice with a countdown on Pro', async () => {
    const {calls} = renderCarte('pro');
    await pressWhenReady('Commencer l’entraînement');
    expect(await screen.findByText('Question 1 ?')).toBeTruthy();
    expect((await screen.findByRole('timer')).textContent).toMatch(/^(10:00|09:5\d)$/);
    expect(calls).toContain('GET /learning/bac-practice/derivabilite');
  });

  it('opens the lab with its slider on Pro', async () => {
    renderCarte('pro');
    await pressWhenReady('Ouvrir le labo');
    expect(await screen.findByText('Tangente et pente')).toBeTruthy();
    expect(screen.getByRole('slider')).toBeTruthy();
  });

  it('restores the prior chapter view on Back and removes a closed revision panel from the URL', async () => {
    const {router} = renderCarte('pro', ['/carte?mind-map=derivabilite', '/carte?mind-map=derivabilite&activity=revision']);
    const revision = 'Fiches de révision Nova : Dérivabilité';
    expect(await screen.findByText(revision, {}, {timeout: 10_000})).toBeTruthy();
    await act(() => router.navigate(-1));
    expect(screen.queryByText(revision)).toBeNull();
    fireEvent.click(await screen.findByRole('button', {name: 'Préparer ma fiche'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Fermer la fiche'}));
    await waitFor(() => expect(screen.queryByText(revision)).toBeNull());
    expect(router.state.location.search).toBe('?mind-map=derivabilite');
  });

  it('accepts a comma, a minus sign and rounding in a lab prediction', () => {
    expect(matchesLabAnswer('1,5', 1.5)).toBe(true);
    expect(matchesLabAnswer('−2', -2)).toBe(true);
    expect(matchesLabAnswer('abc', 1)).toBe(false);
    expect(matchesLabAnswer('1.6', 1.5)).toBe(false);
  });
});
