// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createRoomSession, mergePosts} from './room-session';
import type {RoomPost, RoundSession} from './room-session';
import type {Api, ApiError, RequestOptions} from './types';

const ROOM = '11111111-1111-1111-1111-111111111111';
const base = '/groups/rooms/' + ROOM;
const failure = (status: number, extra: {code?: string; retryAfter?: number} = {}): ApiError =>
  Object.assign(new Error('API request failed'), {status, ...extra});
const session = (round: string): RoundSession => ({session_id:1, topic:'derivabilite', goal:'Comprendre la dérivabilité.', round, notes:[], my_open_points:[]});

type FakeRequest = (method: string, path: string, options?: RequestOptions) => Promise<unknown>;

function fakeTimers() {
  const timers = new Map<number, {fn: () => unknown; ms: number}>();
  let id = 0;
  return {
    setTimer: (fn: () => unknown, ms: number) => { timers.set(++id, {fn, ms}); return id; },
    clearTimer: (key: number) => timers.delete(key),
    pending: () => [...timers.values()],
    async fire() {
      const first = [...timers][0];
      if (!first) throw new Error('no timer scheduled');
      const [key, {fn}] = first;
      timers.delete(key);
      await fn();
    },
  };
}

function fakeServer(initial: RoundSession | null = null) {
  const server: {current: RoundSession | null; posts: RoomPost[]; calls: string[]; failNext: ApiError | null; members: string[]; started: unknown; api: {request: FakeRequest}} = {
    current: initial,
    posts: [{id:'p1', kind:'question', text:'Q ?', author:null, verdict:null}],
    calls: [],
    failNext: null,
    members: ['salma'],
    started: undefined,
    api: {request: async (method, path, options = {}) => {
      server.calls.push(method + ' ' + path);
      if (server.failNext) {
        const error = server.failNext;
        server.failNext = null;
        throw error;
      }
      if (method === 'GET' && path === base + '/posts') return server.posts;
      if (method === 'GET' && path === base) return {id:ROOM, name:'Révisions', owner:true, members:server.members, invite_code:'ABCDEF'};
      if (method === 'GET' && path === base + '/session') {
        if (!server.current) throw failure(404);
        return server.current;
      }
      if (method === 'POST' && path === base + '/session') {
        server.started = options.json;
        server.current = session('explain');
        return server.current;
      }
      if (method === 'POST' && path === base + '/session/next') {
        const order = ['explain', 'question', 'quiz', 'ended'];
        server.current = session(order[order.indexOf((server.current as RoundSession).round) + 1] as string);
        return server.current;
      }
      if (method === 'POST' && path === base + '/session/end') {
        server.current = {...session('ended'), notes:['Point clé']};
        return server.current;
      }
      throw new Error('unexpected ' + method + ' ' + path);
    }},
  };
  return server;
}

function make(initial: RoundSession | null) {
  const server = fakeServer(initial);
  const timers = fakeTimers();
  const store = createRoomSession(server.api as unknown as Api, ROOM, {interval:20000, ...timers});
  return {server, timers, store};
}

describe('room session', () => {
  it('a room without a session is idle and does not fetch posts', async () => {
    const {server, store} = make(null);
    expect(store.getSnapshot().status).toBe('loading');
    await store.refresh();
    expect(store.getSnapshot().status).toBe('none');
    expect(store.getSnapshot().session).toBe(null);
    expect(server.calls).toStrictEqual(['GET ' + base + '/session', 'GET ' + base]);
  });

  it('refresh loads the session and the posts together', async () => {
    const {store} = make(session('question'));
    await store.refresh();
    const snapshot = store.getSnapshot();
    expect(snapshot.status).toBe('active');
    expect(snapshot.session?.round).toBe('question');
    expect(snapshot.posts?.length).toBe(1);
    expect(snapshot.error).toBe(null);
  });

  it('polling refreshes every interval and stops when asked', async () => {
    const {server, timers, store} = make(session('explain'));
    store.startPolling();
    expect(timers.pending().map(timer => timer.ms)).toStrictEqual([20000]);
    await timers.fire();
    expect(server.calls.filter(call => call.endsWith('/session')).length).toBe(1);
    expect(timers.pending().length).toBe(1);
    await timers.fire();
    expect(server.calls.filter(call => call.endsWith('/session')).length).toBe(2);
    store.stopPolling();
    expect(timers.pending().length).toBe(0);
    await store.refresh();
    expect(timers.pending().length).toBe(0);
  });

  it('starting twice does not schedule two timers', () => {
    const {timers, store} = make(session('explain'));
    store.startPolling();
    store.startPolling();
    expect(timers.pending().length).toBe(1);
  });

  it('polling continues after the session ends so members see the next one', async () => {
    const {server, timers, store} = make(session('quiz'));
    store.startPolling();
    server.current = session('ended');
    await timers.fire();
    expect(store.getSnapshot().status).toBe('ended');
    expect(timers.pending().length).toBe(1);
    server.current = session('explain');
    await timers.fire();
    expect(store.getSnapshot().status).toBe('active');
  });

  it('a closed room is reported as gone and polling stops', async () => {
    const {server, timers, store} = make(session('explain'));
    store.startPolling();
    server.failNext = failure(404, {code:'room_not_found'});
    await timers.fire();
    expect(store.getSnapshot().status).toBe('gone');
    expect(timers.pending().length).toBe(0);
  });

  it('polls every five seconds by default', () => {
    const server = fakeServer(null);
    const timers = fakeTimers();
    createRoomSession(server.api as unknown as Api, ROOM, timers).startPolling();
    expect(timers.pending().map(timer => timer.ms)).toStrictEqual([5000]);
  });

  it('polling keeps looking for a session while there is none', async () => {
    const {server, timers, store} = make(null);
    store.startPolling();
    await timers.fire();
    expect(store.getSnapshot().status).toBe('none');
    expect(timers.pending().length).toBe(1);
    server.current = session('explain');
    await timers.fire();
    expect(store.getSnapshot().status).toBe('active');
  });

  it('a refresh after the end picks up a new session', async () => {
    const {server, timers, store} = make(session('ended'));
    store.startPolling();
    await store.refresh();
    expect(timers.pending().length).toBe(1);
    server.current = session('explain');
    await store.refresh();
    expect(store.getSnapshot().status).toBe('active');
    expect(timers.pending().length).toBe(1);
  });

  it('start posts the topic and the owner walks the rounds in order', async () => {
    const {server, store} = make(null);
    await store.refresh();
    await store.start('derivabilite');
    expect(server.started).toStrictEqual({topic:'derivabilite'});
    expect(store.getSnapshot().session?.round).toBe('explain');
    const rounds: (string | undefined)[] = [];
    for (let step = 0; step < 3; step++) {
      await store.next();
      rounds.push(store.getSnapshot().session?.round);
    }
    expect(rounds).toStrictEqual(['question', 'quiz', 'ended']);
    expect(store.getSnapshot().status).toBe('ended');
  });

  it('end moves to ended with the shared notes', async () => {
    const {timers, store} = make(session('question'));
    store.startPolling();
    await store.end();
    const snapshot = store.getSnapshot();
    expect(snapshot.status).toBe('ended');
    expect(snapshot.session?.notes).toStrictEqual(['Point clé']);
    expect(timers.pending().length).toBe(1);
  });

  it('locks the session for a Free learner but keeps reading the posts, without polling the session again', async () => {
    const {server, store} = make(session('explain'));
    server.failNext = failure(403, {code:'pro_required'});
    await store.refresh();
    expect(store.getSnapshot().status).toBe('locked');
    expect(store.getSnapshot().posts?.length).toBe(1);
    server.calls.length = 0;
    await store.refresh();
    expect(server.calls).not.toContain('GET ' + base + '/session');
    await store.unlock();
    expect(store.getSnapshot().status).toBe('active');
  });

  it('locks when starting a session needs Pro', async () => {
    const {server, store} = make(null);
    server.failNext = failure(403, {code:'pro_required'});
    await store.start('derivabilite');
    expect(store.getSnapshot().status).toBe('locked');
    expect(store.getSnapshot().busy).toBe(false);
  });

  it('action failures are described and leave the session untouched', async () => {
    const {server, store} = make(session('explain'));
    await store.refresh();
    server.failNext = failure(403);
    await store.next();
    expect(store.getSnapshot().error?.code).toBe('forbidden');
    server.failNext = failure(503, {retryAfter:12});
    await store.next();
    expect(store.getSnapshot().error).toStrictEqual({code:'busy', retryAfter:12});
    server.failNext = failure(404, {code:'unknown_topic'});
    await store.start('nope');
    expect(store.getSnapshot().error?.code).toBe('unknown_topic');
    expect(store.getSnapshot().session?.round).toBe('explain');
    expect(store.getSnapshot().busy).toBe(false);
    await store.next();
    expect(store.getSnapshot().error).toBe(null);
  });

  it('a conflict resynchronises with the server', async () => {
    const {server, store} = make(session('explain'));
    await store.refresh();
    server.current = session('ended');
    server.failNext = failure(409);
    await store.next();
    expect(store.getSnapshot().error?.code).toBe('conflict');
    expect(store.getSnapshot().status).toBe('ended');
  });

  it('locks the session after a Pro denial while keeping the lobby visible', async () => {
    const {server, store} = make(null);
    await store.refresh();
    server.failNext = failure(403, {code:'pro_required'});
    await store.start('derivabilite');
    expect(store.getSnapshot()).toMatchObject({status:'locked', session:null, posts:server.posts, error:null});
  });

  it('a failed poll keeps the last state, reports the error and keeps polling', async () => {
    const {server, timers, store} = make(session('explain'));
    store.startPolling();
    await timers.fire();
    server.failNext = failure(500);
    await timers.fire();
    expect(store.getSnapshot().status).toBe('active');
    expect(store.getSnapshot().error?.code).toBe('unavailable');
    expect(timers.pending().length).toBe(1);
    await timers.fire();
    expect(store.getSnapshot().error).toBe(null);
  });

  it('only one action runs at a time', async () => {
    const {server, store} = make(session('explain'));
    await store.refresh();
    await Promise.all([store.next(), store.next()]);
    expect(server.calls.filter(call => call.endsWith('/session/next')).length).toBe(1);
  });

  it('a response that arrives after stopPolling is ignored', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = () => resolve(); });
    const timers = fakeTimers();
    const api = {request: async (_method: string, path: string) => {
      if (path.endsWith('/session')) { await gate; return session('question'); }
      return [];
    }};
    const store = createRoomSession(api as unknown as Api, ROOM, timers);
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getSnapshot().status));
    const pending = store.refresh();
    store.stopPolling();
    release();
    await pending;
    expect(seen).toStrictEqual([]);
    expect(store.getSnapshot().status).toBe('loading');
    expect(timers.pending().length).toBe(0);
  });

  it('a newer refresh wins over a slower older one', async () => {
    const timers = fakeTimers();
    const gates: ((value?: unknown) => void)[] = [];
    const api = {request: async (_method: string, path: string) => {
      if (path.endsWith('/session')) {
        const round = gates.length ? 'question' : 'explain';
        await new Promise(resolve => gates.push(resolve));
        return session(round);
      }
      return [];
    }};
    const store = createRoomSession(api as unknown as Api, ROOM, timers);
    const older = store.refresh();
    const newer = store.refresh();
    gates[1]?.();
    await newer;
    gates[0]?.();
    await older;
    expect(store.getSnapshot().session?.round).toBe('question');
  });

  it('each refresh also brings the current member list, with or without a session', async () => {
    const {server, store} = make(null);
    await store.refresh();
    expect(store.getSnapshot().room?.members).toStrictEqual(['salma']);
    server.members = ['salma', 'yassine'];
    server.current = session('explain');
    await store.refresh();
    expect(store.getSnapshot().room?.members).toStrictEqual(['salma', 'yassine']);
  });

  it('a failed member refresh keeps the session view', async () => {
    const {server, store} = make(session('explain'));
    const request = server.api.request;
    server.api.request = async (method, path, options) => {
      if (path === base) throw failure(503);
      return request(method, path, options);
    };
    await store.refresh();
    expect(store.getSnapshot().status).toBe('active');
    expect(store.getSnapshot().error).toBe(null);
  });

  it('a poll keeps older posts and replaces duplicates', () => {
    const older = [{id:'3', text:'c'}, {id:'2', text:'b'}, {id:'1', text:'a'}];
    const page = [{id:'4', text:'d'}, {id:'3', text:'c, edited'}];
    expect(mergePosts(page, older).map(post => post.id + post.text)).toStrictEqual(['4d', '3c, edited', '2b', '1a']);
  });

  it('owner actions call the room endpoints and refresh the room', async () => {
    const calls: [string, string, unknown][] = [];
    const api = {request: async (method: string, path: string, options: RequestOptions = {}) => {
      calls.push([method, path, options.json]);
      if (path === base + '/session') throw failure(404);
      if (method === 'GET' && path === base) return {id:ROOM, members:['salma'], owner:false, owner_pseudo:'salma'};
      return {};
    }};
    const store = createRoomSession(api as unknown as Api, ROOM, {setTimer:() => 1, clearTimer:() => {}});
    await store.removeMember('ali01');
    await store.transferOwner('salma');
    expect(calls.filter(([method]) => method !== 'GET')).toStrictEqual(
      [['DELETE', base + '/members/ali01', undefined], ['POST', base + '/owner', {pseudo:'salma'}]]);
    expect(store.getSnapshot().room?.owner_pseudo).toBe('salma');
  });
});
