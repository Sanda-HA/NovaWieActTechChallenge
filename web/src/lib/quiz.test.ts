// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createQuiz} from './quiz';
import type {Api, Quiz, QuizResult, RequestOptions} from './types';

const quiz: Quiz = {
  quiz_id:'11111111-1111-1111-1111-111111111111', topic:'derivabilite',
  questions:[1,2,3].map(n => ({id:'q' + n, question:'Question ' + n, choices:['a','b','c','d']})),
};
const graded: QuizResult = {score:2, total:3, results:[
  {id:'q1', correct:true, answer_index:1, explanation:'Parce que.', source:{chunk_id:'c', source:'Manuel', page:4}},
  {id:'q2', correct:true, answer_index:0, explanation:'', source:null},
  {id:'q3', correct:false, answer_index:2, explanation:'', source:null},
]};

type Call = {method: string; path: string; json: unknown};

function fakeApi(handler: (method: string, path: string, options: RequestOptions) => unknown) {
  const calls: Call[] = [];
  const api = {calls, request: async (method: string, path: string, options: RequestOptions = {}) => {
    calls.push({method, path, json:options.json});
    return handler(method, path, options);
  }};
  return api as unknown as Api & {calls: Call[]};
}

const failure = (status: number, extra: {code?: string; retryAfter?: number} = {}) =>
  Object.assign(new Error('API request failed'), {status, ...extra});

async function answered(api: Api) {
  const store = createQuiz(api);
  await store.load('derivabilite');
  store.select('q1',1); store.next();
  store.select('q2',0); store.next();
  store.select('q3',0);
  return store;
}

describe('quiz', () => {
  it('timed Bac practice reads its own route, counts down, and sends a partial copy once the time is up', async () => {
    let clock = 1000;
    const api = fakeApi(method => (method === 'GET' ? {...quiz, duration_seconds:600} : graded));
    const store = createQuiz(api, () => clock);
    await store.load('derivabilite', {timed:true});
    expect(api.calls[0]?.path).toBe('/learning/bac-practice/derivabilite');
    expect(store.getState().deadline).toBe(601_000);
    store.select('q1', 1);
    await store.submit();
    expect(store.getState().status).toBe('ready');
    clock = 601_000;
    store.select('q2', 0);
    expect(store.getState().answers).toStrictEqual({q1:1});
    await store.submit();
    expect(store.getState().status).toBe('graded');
    expect(api.calls[1]).toStrictEqual({method:'POST', path:'/learning/quiz/' + quiz.quiz_id + '/answers', json:{answers:{q1:1}}});
  });

  it('load fetches the quiz for the topic and moves loading to ready', async () => {
    const api = fakeApi(() => quiz);
    const store = createQuiz(api);
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().status));
    expect(store.getState().status).toBe('idle');
    await store.load('derivabilite');
    expect(seen).toStrictEqual(['loading', 'ready']);
    expect(api.calls).toStrictEqual([{method:'GET', path:'/learning/quiz/derivabilite', json:undefined}]);
    expect(store.getState().quiz?.questions.length).toBe(3);
    expect(store.getSnapshot()).toBe(store.getState());
  });

  it('loads the free sample quiz and the room quiz round from their own paths', async () => {
    const api = fakeApi(() => quiz);
    const store = createQuiz(api);
    await store.load('derivabilite', {sample:true});
    await store.load('derivabilite', {roomId:'room-1'});
    expect(api.calls.map(call => call.path)).toStrictEqual(['/learning/sample-quiz', '/groups/rooms/room-1/session/quiz']);
  });

  it('names pro_required and quiz_round_inactive instead of a generic failure', async () => {
    const store = createQuiz(fakeApi(() => { throw failure(403, {code:'pro_required'}); }));
    await store.load('derivabilite');
    expect(store.getState().error?.code).toBe('pro_required');
    const round = createQuiz(fakeApi(() => { throw failure(409, {code:'quiz_round_inactive'}); }));
    await round.load('derivabilite', {roomId:'room-1'});
    expect(round.getState().error?.code).toBe('quiz_round_inactive');
  });

  it('select records one choice per question and ignores unknown questions or indexes', async () => {
    const store = createQuiz(fakeApi(() => quiz));
    store.select('q1',0);
    expect(store.getState().answers).toStrictEqual({});
    await store.load('derivabilite');
    store.select('q1',2); store.select('q1',3); store.select('nope',1); store.select('q2',9);
    expect(store.getState().answers).toStrictEqual({q1:3});
  });

  it('issues sample, room and timed quizzes at their own endpoints', async () => {
    const api = fakeApi(() => ({...quiz, duration_seconds:600}));
    const store = createQuiz(api);
    await store.load('derivabilite', {sample:true});
    await store.load('derivabilite', {roomId:'room-1'});
    await store.load('derivabilite', {timed:true});
    expect(api.calls.map(call => [call.method, call.path])).toStrictEqual([
      ['GET', '/learning/sample-quiz'],
      ['GET', '/groups/rooms/room-1/session/quiz'],
      ['GET', '/learning/bac-practice/derivabilite'],
    ]);
  });

  it('grades partial timed answers at the deadline and suppresses duplicate submits', async () => {
    let now = 1_000;
    const api = fakeApi(method => method === 'GET' ? {...quiz, duration_seconds:12} : graded);
    const store = createQuiz(api, () => now);
    await store.load('derivabilite', {timed:true});
    expect(store.getState().deadline).toBe(13_000);
    store.select('q1', 1);
    await store.submit();
    expect(api.calls).toHaveLength(1);
    now = 13_000;
    store.select('q2', 2);
    await Promise.all([store.submit(), store.submit()]);
    expect(api.calls.slice(1)).toStrictEqual([
      {method:'POST', path:'/learning/quiz/' + quiz.quiz_id + '/answers', json:{answers:{q1:1}}},
    ]);
    expect(store.getState().status).toBe('graded');
  });

  it.each([[403, 'pro_required'], [409, 'quiz_round_inactive']])('preserves status %i with code %s', async (status, code) => {
    const store = createQuiz(fakeApi(() => { throw failure(status, {code}); }));
    await store.load('derivabilite');
    expect(store.getState().error).toStrictEqual({code, retryAfter:null});
  });

  it('next only advances past an answered question and stops on the last one', async () => {
    const store = createQuiz(fakeApi(() => quiz));
    await store.load('derivabilite');
    store.next();
    expect(store.getState().step).toBe(0);
    store.select('q1',0); store.next();
    store.select('q2',0); store.next(); store.next();
    expect(store.getState().step).toBe(2);
  });

  it('submit posts the answers and keeps the grading result', async () => {
    const api = fakeApi((method) => method === 'GET' ? quiz : graded);
    const store = await answered(api);
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().status));
    await store.submit();
    expect(seen).toStrictEqual(['submitting', 'graded']);
    expect(api.calls[1]).toStrictEqual({method:'POST', path:'/learning/quiz/' + quiz.quiz_id + '/answers',
      json:{answers:{q1:1, q2:0, q3:0}}});
    expect(store.getState().result?.score).toBe(2);
  });

  it('submit does nothing until every question is answered', async () => {
    const api = fakeApi(() => quiz);
    const store = createQuiz(api);
    await store.load('derivabilite');
    store.select('q1',1);
    await store.submit();
    expect(api.calls.length).toBe(1);
    expect(store.getState().status).toBe('ready');
  });

  it('a busy agent fails with the retry delay, and load can be retried', async () => {
    let attempts = 0;
    const store = createQuiz(fakeApi(() => {
      if (attempts++ === 0) throw failure(503, {retryAfter:30});
      return quiz;
    }));
    await store.load('derivabilite');
    expect(store.getState().status).toBe('failed');
    expect(store.getState().error).toStrictEqual({code:'busy', retryAfter:30});
    await store.load('derivabilite');
    expect(store.getState().status).toBe('ready');
    expect(store.getState().error).toBe(null);
  });

  it('a topic missing from the corpus is reported as not_in_course', async () => {
    const store = createQuiz(fakeApi(() => { throw failure(404, {code:'not_in_course'}); }));
    await store.load('suites');
    expect(store.getState().error).toStrictEqual({code:'not_in_course', retryAfter:null});
  });

  it('an expired quiz fails on submit but keeps the answers so submit can be retried', async () => {
    let fail = true;
    const store = await answered(fakeApi((method) => {
      if (method === 'GET') return quiz;
      if (fail) { fail = false; throw failure(404); }
      return graded;
    }));
    await store.submit();
    expect(store.getState().status).toBe('failed');
    expect(store.getState().error?.code).toBe('expired');
    expect(store.getState().answers).toStrictEqual({q1:1, q2:0, q3:0});
    await store.submit();
    expect(store.getState().status).toBe('graded');
  });

  it('a reply that arrives after reset or a newer load is discarded', async () => {
    const pending: ((value?: unknown) => void)[] = [];
    const store = createQuiz(fakeApi(() => new Promise(resolve => pending.push(resolve))));
    const first = store.load('derivabilite');
    store.reset();
    pending[0]?.(quiz);
    await first;
    expect(store.getState().status).toBe('idle');
    const stale = store.load('suites');
    const fresh = store.load('primitives');
    pending[2]?.({...quiz, topic:'primitives'});
    pending[1]?.(quiz);
    await Promise.all([stale, fresh]);
    expect(store.getState().quiz?.topic).toBe('primitives');
  });

  it('an aborted request is not reported as an error', async () => {
    const store = createQuiz(fakeApi(() => { throw Object.assign(new Error('aborted'), {name:'AbortError'}); }));
    await store.load('derivabilite');
    expect(store.getState().error).toBe(null);
    expect(store.getState().status).toBe('idle');
  });
});
