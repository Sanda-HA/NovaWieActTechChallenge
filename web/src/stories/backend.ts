import {bank, catalog, chatFixtures, profileFixture, progressFixture, type ScenarioName} from '../fixtures';
import type {Quiz, QuizResult, Room} from '../lib/types';

const PSEUDO = 'eleve01';
const json = (body: unknown, status = 200) => Response.json(body, {status});
const fail = (status: number, error?: string) => json({detail: {error}}, status);
const never = () => new Promise<Response>(() => {});

const sse = (events: ReadonlyArray<[string, unknown]>) =>
  new Response(events.map(([kind, data]) => `event: ${kind}\ndata: ${JSON.stringify(data)}\n\n`).join(''), {
    headers: {'Content-Type': 'text/event-stream'},
  });

const quiz: Quiz = {
  quiz_id: 'q1',
  topic: 'derivabilite',
  questions: [
    {id: 'a', question: 'Quelle est la dérivée de $x^2$ ?', choices: ['$x$', '$2x$', '$x^2$', '$2$']},
    {id: 'b', question: 'Quelle est la dérivée d’une constante ?', choices: ['0', '1', 'La constante', 'Indéfinie']},
  ],
};
const quizResult: QuizResult = {
  score: 1,
  total: 2,
  results: [
    {id: 'a', correct: true, answer_index: 1, explanation: "On applique $(x^n)'=nx^{n-1}$.", source: null},
    {id: 'b', correct: false, answer_index: 0, explanation: 'Une constante ne varie pas.', source: null},
  ],
};

const sampleQuiz = {
  quiz_id: '33333333-3333-4333-8333-333333333333',
  topic: 'derivabilite',
  questions: [{id: 'sample_derivative', question: 'Quelle est la dérivée de $f(x) = x^2$ ?', choices: ['$x$', '$2x$', '$2$', '$x^2$']}],
};

const room: Room & {active_members: string[]; session_round: string | null} = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Révisions du bac',
  owner: true,
  members: [PSEUDO, 'yasmine07'],
  invite_code: 'K7M2QX',
  active_members: [PSEUDO],
  session_round: null,
};

const verdicts: Partial<Record<ScenarioName, unknown>> = {
  correct: {verdict: 'correct', issue: '', guiding_question: '', source: null},
  incorrect: {
    verdict: 'incorrect',
    issue: 'La dérivée de $x^2$ est $2x$, pas $x$.',
    guiding_question: 'Que devient l’exposant quand on dérive ?',
    source: {chunk_id: 'c1', source: 'Manuel, tome 2', page: 147},
  },
  incomplete: {
    verdict: 'incomplete',
    issue: 'Il manque la règle utilisée.',
    guiding_question: 'Quelle règle applique-t-on ici ?',
    source: null,
    missing_points: ['la règle de dérivation d’une puissance'],
  },
  unknown: {verdict: 'unknown', issue: '', guiding_question: 'Peux-tu reformuler avec tes mots ?', source: null, restate_prompt: 'Reformule ton explication.'},
};

/** A stand-in for the EdNova backend: each scenario of ui-preview/review.html is a different set of answers. */
export function backendFor(scenario: ScenarioName) {
  let profileReads = 0;
  return async (url: string, init: RequestInit): Promise<Response> => {
    const method = init.method ?? 'GET';
    const path = url.slice(4).split('?')[0] ?? '';
    const body: unknown = typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : null;
    const denied = scenario === 'permission' && method !== 'GET';

    if (path === '/auth/me') {
      if (method !== 'DELETE') return json({pseudo: PSEUDO});
      return scenario === 'delete-error' ? fail(500) : new Response(null, {status: 204});
    }
    if (path === '/auth/register') {
      if (scenario === 'pending') return never();
      if (scenario === 'duplicate') return fail(409, 'pseudo_taken');
      if (scenario === 'register-error') return fail(500);
      return json({}, 201);
    }
    if (path === '/auth/login') {
      if (scenario === 'login-failed' || scenario === 'expired') return fail(401, 'invalid_credentials');
      return json({access_token: 'storybook-token', token_type: 'bearer'});
    }
    if (path === '/me/profile') {
      if (method === 'PUT') return denied ? fail(403) : scenario === 'error' ? fail(500) : json({...profileFixture, ...(body as object)});
      profileReads += 1;
      // The first read is the session restore; later reads are the screen's own.
      if (scenario === 'error' && profileReads > 1) return fail(500);
      if (scenario === 'pro-profile') return json({...profileFixture, student_plan: 'pro'});
      if (scenario === 'pro-requested') return json({...profileFixture, pro_requested: true});
      return json(profileFixture);
    }
    if (path === '/me/pro-request' && method === 'DELETE') return new Response(null, {status: 204});
    if (path === '/me/pro-request') return json({...profileFixture, pro_requested: true});
    if (path === '/learning/sample-quiz') return json(sampleQuiz);
    if (path === '/learning/mistake-practice') {
      return scenario === 'pro-required' ? fail(403, 'pro_required') : json({session_id: 'storybook-session', message: 'Exerçons-nous sur la dérivabilité.'});
    }
    if (path === '/topics') {
      if (scenario === 'error') return fail(500);
      return json(scenario === 'empty' ? {...catalog, topics: [], subtopics: []} : catalog);
    }
    if (path === '/learning/progress') {
      if (scenario === 'error') return fail(500);
      const rows =
        scenario === 'empty'
          ? []
          : progressFixture.map(row => ({...row, mastery: scenario === 'mastery-null' ? null : scenario === 'mastery-zero' ? 0 : row.mastery}));
      const mistakes = scenario.startsWith('pro-') ? [{topic: 'derivabilite', label: 'Dérivabilité', type: 'calculation'}] : [];
      return json({topics: rows, subtopics: [], mistakes});
    }
    if (path === '/learning/diagnostic') {
      if (method === 'POST') return json({diagnostic_score: 3, style: 'examples'});
      const cardOf = (id: string) => bank.find(card => card.id === id);
      const options = (id: string) => Object.fromEntries((cardOf(id)?.choices ?? []).map(choice => [choice.id, choice.label]));
      return json({
        preferences: ['p1', 'p2'].map(id => ({id, question: cardOf(id)?.question ?? '', options: options(id)})),
        styles_probe: {id: 's1', concept: 'la révision espacée', versions: options('s1')},
        level_check: bank
          .filter(card => card.id.startsWith('l'))
          .map(card => ({id: card.id, question: card.question, options: card.choices.map(choice => choice.label)})),
      });
    }
    if (path === '/study/summary') {
      if (scenario === 'timer-error') return fail(500);
      const stopped = scenario === 'timer-stopped';
      const running = scenario === 'timer-running';
      return json({
        in_progress: running,
        planned_end: running ? new Date(Date.now() + 23 * 60_000).toISOString() : null,
        minutes_today: stopped ? 2 : 0,
        minutes_week: stopped ? 2 : 0,
        streak_days: stopped ? 1 : 0,
      });
    }
    if (path === '/study/sessions') {
      const finished = {id: 1, started_at: new Date(Date.now() - 180_000).toISOString(), ended_at: new Date(Date.now() - 60_000).toISOString(), minutes: 2};
      return json(scenario === 'timer-stopped' ? [finished] : []);
    }
    if (path === '/study/start' || path === '/study/stop') return scenario === 'timer-error' ? fail(500) : json({});
    if (path === '/tutor/sessions') return json({id: 'storybook-session'});
    if (path.endsWith('/messages/stream')) {
      if (scenario === 'pending') return never();
      if (scenario === 'error') return fail(500, 'agent_unavailable');
      return sse([
        ['stage', {stage: 'retrieving'}],
        ['result', chatFixtures[scenario] ?? chatFixtures.success],
      ]);
    }
    if (path === '/tutor/feedback') return json({});
    if (path.startsWith('/learning/quiz/') && method === 'GET' && scenario === 'pro-required') return fail(403, 'pro_required');
    if (path.startsWith('/learning/quiz/')) return method === 'POST' ? json(quizResult) : json(quiz);
    if (path === '/groups/demo/check') {
      if (denied) return fail(403);
      if (scenario === 'error') return fail(500);
      return json(verdicts[scenario] ?? verdicts.unknown);
    }
    if (path === '/groups/rooms') {
      if (method === 'GET') return json(scenario === 'empty' ? [] : [room]);
      return denied ? fail(403) : json(room);
    }
    if (path === `/groups/rooms/${room.id}`) return json(room);
    if (path === `/groups/rooms/${room.id}/session`) return fail(404, 'no_session');
    if (path === `/groups/rooms/${room.id}/posts`) return json([]);
    return fail(404, 'storybook_unhandled');
  };
}
