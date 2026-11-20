import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {App} from '../../app/App';
import {createQueryClient} from '../../app/queryClient';
import {appRoutes} from '../../app/router';
import {createSession} from '../../app/session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes} from '../../app/testing';
import {backendFor} from '../../stories/backend';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);
afterEach(() => sessionStorage.clear());

const ROOM = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Salle de yasmine07',
  owner: false,
  members: ['yasmine07', 'eleve01'],
  invite_code: 'K7M2QX',
  active_members: [],
  session_round: null,
};

function renderSalle() {
  const joins: unknown[] = [];
  const rest = backendFor('empty');
  const fetchImpl = async (url: string, init: RequestInit) => {
    const path = url.slice(4).split('?')[0];
    if (path === '/groups/rooms/join') {
      joins.push(JSON.parse(String(init.body)));
      return Response.json(ROOM);
    }
    if (path === `/groups/rooms/${ROOM.id}`) return Response.json(ROOM);
    if (path === `/groups/rooms/${ROOM.id}/posts`) return Response.json([]);
    if (path === `/groups/rooms/${ROOM.id}/session`) return Response.json({detail: {error: 'no_session'}}, {status: 404});
    return rest(url, init);
  };
  const session = createSession({fetchImpl, storage: memoryStorage('t1')});
  const router = createMemoryRouter(appRoutes, {initialEntries: ['/salle']});
  render(<App session={session} router={router} queryClient={createQueryClient()} />);
  return {joins, router};
}

describe('Salle invite', () => {
  it('joins with the pending invite code once, then forgets it', async () => {
    sessionStorage.setItem('ednova-join-code', 'K7M2QX');
    const {joins, router} = renderSalle();
    await waitFor(() => expect(joins).toStrictEqual([{code: 'K7M2QX'}]));
    expect(sessionStorage.getItem('ednova-join-code')).toBeNull();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/salle/${ROOM.id}`));
    expect(await screen.findByText('Bienvenue dans la salle.')).toBeTruthy();
  });

  it('does not join anything without a pending code', async () => {
    const {joins} = renderSalle();
    expect(await screen.findByText('Tu ne fais encore partie d’aucune salle.')).toBeTruthy();
    expect(joins).toStrictEqual([]);
  });
});

describe('Salle settings and consent', () => {
  it('lets the owner turn Nova off and a member withdraw one consent choice', async () => {
    const owned = {...ROOM, owner: true, owner_pseudo: 'eleve01', tutor_enabled: true, tutor_round_prompts: false, tutor_version: 1};
    const patches: {path: string; body: unknown}[] = [];
    const consent = {allow_ai_text: true, allow_solo_context: false, allow_personalization: false, allow_group_insights: true};
    const rest = backendFor('pro-profile');
    const fetchImpl = async (url: string, init: RequestInit) => {
      const path = url.slice(4).split('?')[0] ?? '';
      if (path === '/groups/rooms') return Response.json([owned]);
      if (path === `/groups/rooms/${ROOM.id}`) return Response.json(owned);
      if (path === `/groups/rooms/${ROOM.id}/posts`) return Response.json([]);
      if (path === `/groups/rooms/${ROOM.id}/session`) return Response.json({detail: {error: 'no_session'}}, {status: 404});
      if (path === `/groups/rooms/${ROOM.id}/consent` && init.method === 'GET') return Response.json(consent);
      if (init.method === 'PATCH') {
        patches.push({path, body: JSON.parse(String(init.body))});
        return Response.json(path.endsWith('/consent') ? {...consent, allow_ai_text: false} : {...owned, tutor_enabled: false});
      }
      return rest(url, init);
    };
    const session = createSession({fetchImpl, storage: memoryStorage('t2')});
    const router = createMemoryRouter(appRoutes, {initialEntries: [`/salle/${ROOM.id}`]});
    render(<App session={session} router={router} queryClient={createQueryClient()} />);

    fireEvent.click(await screen.findByRole('switch', {name: 'Nova aide la salle'}));
    await waitFor(() => expect(patches).toContainEqual({path: `/groups/rooms/${ROOM.id}/settings`, body: {tutor_enabled: false}}));
    fireEvent.click(await screen.findByRole('switch', {name: 'Nova peut lire mes messages'}));
    await waitFor(() => expect(patches).toContainEqual({path: `/groups/rooms/${ROOM.id}/consent`, body: {allow_ai_text: false}}));
  });
});

describe('Salle session for a Free member of a Pro-hosted room', () => {
  it('shows the rounds, quiz, Ask Nova and the Pro-only parts as locked, with no Pro badge on the heading', async () => {
    const hosted = {...ROOM, owner: false, owner_pseudo: 'yasmine07', tutor_enabled: true, tutor_round_prompts: false, tutor_version: 1, session_round: 'explain'};
    const paths: string[] = [];
    const rest = backendFor('empty');
    const fetchImpl = async (url: string, init: RequestInit) => {
      const path = url.slice(4).split('?')[0] ?? '';
      paths.push(path);
      if (path === '/groups/rooms') return Response.json([hosted]);
      if (path === `/groups/rooms/${ROOM.id}`) return Response.json(hosted);
      if (path === `/groups/rooms/${ROOM.id}/posts`) return Response.json([]);
      if (path === `/groups/rooms/${ROOM.id}/session`) {
        return Response.json({topic: 'derivabilite', goal: 'Comprendre la dérivabilité.', round: 'explain', notes: [], my_open_points: []});
      }
      return rest(url, init);
    };
    const session = createSession({fetchImpl, storage: memoryStorage('t3')});
    const router = createMemoryRouter(appRoutes, {initialEntries: [`/salle/${ROOM.id}`]});
    render(<App session={session} router={router} queryClient={createQueryClient()} />);

    expect(await screen.findByRole('list', {name: 'Manches de la séance'})).toBeTruthy();
    expect(screen.getByRole('region', {name: 'Demander à Nova'})).toBeTruthy();
    expect(screen.getByText(/Les tendances du groupe et les avis sur les explications sont réservés à l’offre Pro/)).toBeTruthy();
    expect(screen.queryByText(/Tu peux suivre une séance gratuitement/)).toBeNull();
    expect(screen.getByRole('heading', {name: 'Séance de groupe'}).textContent).not.toMatch(/Pro/);
    expect(paths).not.toContain(`/groups/rooms/${ROOM.id}/session/insights`);
  });
});
