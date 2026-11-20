import {setupI18n} from '@lingui/core';
import {I18nProvider} from '@lingui/react';
import {QueryClientProvider} from '@tanstack/react-query';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {createQueryClient} from '../../app/queryClient';
import {createSession, SessionProvider} from '../../app/session';
import {memoryStorage} from '../../app/testing';
import {MindMaps} from './MindMaps';

const chapters = [
  {topic: 'derivabilite', subject: 'math', title: 'Dérivabilité'},
  {topic: 'dipole_rc', subject: 'physics', title: 'Dipôle RC'},
  {topic: 'immunite', subject: 'svt', title: 'Immunité'},
] as const;

function mapFor(chapter: typeof chapters[number], update_available = false) {
  return {
    map: {
      topic: chapter.topic,
      subject: chapter.subject,
      source_revision: 1,
      reply_language: 'fr',
      generated_at: '2026-11-19T10:00:00Z',
      sources: [{source: 'Manuel de référence'}],
      root: {id: 'root', label: chapter.title, children: [
        {id: 'b1', label: 'Notions', summary: 'Le texte du résumé.', children: [{id: 'b1-1', label: 'Exemple', children: []}]},
        {id: 'b2', label: 'Méthodes', children: []},
        {id: 'b3', label: 'Applications', children: []},
      ]},
    },
    update_available,
  };
}

function renderMaps({subject = 'math', plan = 'pro', respond}: {
  subject?: string;
  plan?: 'pro' | 'free';
  respond: (path: string, init: RequestInit) => Response | Promise<Response>;
}) {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.slice(4);
    if (path === '/me/profile') return Response.json({
      student_plan: plan, grade: '4eme_annee_secondaire', section: 'sciences_experimentales',
      reply_language: 'fr', presentation: 'reading',
    });
    if (path === '/learning/mind-maps') return Response.json({chapters});
    if (path.startsWith('/learning/mind-maps/')) return respond(path, init);
    return Response.json({in_progress: false, planned_end: null});
  });
  const session = createSession({fetchImpl, storage: memoryStorage('mind-maps')});
  session.signedIn('eleve01');
  const onAsk = vi.fn();
  const queryClient = createQueryClient();
  const i18n = setupI18n({locale: 'fr', messages: {fr: {}}});
  const view = (shown: string) => (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <MindMaps subject={shown} onAsk={onAsk} />
        </SessionProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  const {rerender} = render(view(subject));
  return {onAsk, fetchImpl, changeSubject: (next: string) => rerender(view(next))};
}

async function selectChapter(topic: string) {
  const select = await screen.findByRole('combobox', {name: 'Chapitre'});
  fireEvent.change(select, {target: {value: topic}});
}

describe('mind maps', () => {
  it.each(chapters.slice(1))('shows a saved $subject map and sends the selected concept to its tutor', async chapter => {
    const {onAsk, fetchImpl, changeSubject} = renderMaps({
      subject: chapter.subject, plan: 'free', respond: () => Response.json(mapFor(chapter)),
    });
    const select = await screen.findByRole('combobox', {name: 'Chapitre'});
    expect(within(select).queryByRole('option', {name: 'Dérivabilité'})).toBeNull();
    expect(within(select).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['', chapter.topic]);
    await selectChapter(chapter.topic);

    const branch = await screen.findByRole('button', {name: 'Développer Notions'});
    expect(screen.getByRole('button', {name: 'Plan'}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(branch);
    fireEvent.click(screen.getByRole('button', {name: 'Exemple'}));
    fireEvent.click(screen.getByRole('button', {name: 'Demander à Nova'}));
    expect(onAsk).toHaveBeenCalledWith(chapter.subject, `Dans le chapitre « ${chapter.title} », explique « Exemple » dans la partie « Notions » avec un exemple court.`);
    expect(screen.queryByText(/Le texte du résumé|Manuel de référence/)).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Carte'}));
    expect(screen.getByRole('region', {name: 'Carte des notions'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Exemple'}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', {name: 'Replier Notions'}));
    expect(screen.queryByRole('button', {name: 'Exemple'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Notions'}).getAttribute('aria-pressed')).toBe('true');
    expect(fetchImpl.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false);

    changeSubject('chemistry');
    expect(screen.queryByRole('heading', {name: 'Cartes mentales'})).toBeNull();
  });

  it('keeps an older saved map visible when the server rejects a refresh for a stale Pro plan', async () => {
    const {fetchImpl} = renderMaps({respond: (_path, init) => init.method === 'POST'
      ? Response.json({detail: {error: 'pro_required', feature: 'mind_map'}}, {status: 403})
      : Response.json(mapFor(chapters[0], true))});
    await selectChapter('derivabilite');
    fireEvent.click(await screen.findByRole('button', {name: 'Mettre à jour la carte'}));
    expect(await screen.findByRole('link', {name: 'Comparer les offres'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Mettre à jour la carte'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Dérivabilité'})).toBeTruthy();
    expect(fetchImpl.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
  });

  it('aborts generation when the subject changes and leaves a late response out of the next subject', async () => {
    let response: ((value: Response) => void) | undefined;
    let signal: AbortSignal | null | undefined;
    const {changeSubject} = renderMaps({respond: (path, init) => {
      if (init.method === 'POST') {
        signal = init.signal;
        return new Promise(resolve => {response = resolve;});
      }
      if (path.endsWith('/dipole_rc')) return Response.json(mapFor(chapters[1]));
      return Response.json({map: null, update_available: false});
    }});
    await selectChapter('derivabilite');
    fireEvent.click(await screen.findByRole('button', {name: 'Générer la carte'}));
    await waitFor(() => expect(signal?.aborted).toBe(false));

    changeSubject('physics');
    await waitFor(() => expect(signal?.aborted).toBe(true));
    await selectChapter('dipole_rc');
    expect(await screen.findByRole('button', {name: 'Dipôle RC'})).toBeTruthy();
    await act(async () => response?.(Response.json(mapFor(chapters[0]))));
    expect(screen.queryByRole('button', {name: 'Dérivabilité'})).toBeNull();
  });
});
