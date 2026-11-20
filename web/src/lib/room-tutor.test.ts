import {describe, expect, it} from 'vitest';
import {createRoomTutor, type TutorRequest} from './room-tutor';
import type {ApiError} from './types';

const request = (state: TutorRequest['state'], result_post_id: number | null = null): TutorRequest => ({
  id: 'r1',
  kind: 'explain',
  state,
  created_at: '2026-01-01T00:00:00Z',
  result_post_id,
});
const failure = (status: number, code?: string) => Object.assign(new Error('x'), {status, code}) as ApiError;

function setup(script: (method: string, path: string, options: {headers?: Record<string, string>; json?: unknown}) => unknown) {
  const calls: {method: string; path: string; headers?: Record<string, string>; json?: unknown}[] = [];
  const timers: (() => unknown)[] = [];
  const posts: (number | null)[] = [];
  let stale = 0;
  let keys = 0;
  const api = {
    request: async (method: string, path: string, options: {headers?: Record<string, string>; json?: unknown} = {}) => {
      calls.push({method, path, ...options});
      const result = script(method, path, options);
      if (result instanceof Error) throw result;
      return result;
    },
  };
  const tutor = createRoomTutor(api as never, 'room', {
    onStale: () => void stale++,
    onPost: id => void posts.push(id),
    newKey: () => `key-${++keys}`,
    setTimer: callback => timers.push(callback),
    clearTimer: () => {},
  });
  const tick = async () => void (await timers.shift()?.());
  return {tutor, calls, tick, posts, stale: () => stale};
}

describe('createRoomTutor', () => {
  it('polls the request by id until it succeeds, then hands over the post', async () => {
    let polls = 0;
    const {tutor, calls, tick, posts} = setup(method =>
      method === 'POST' ? request('queued') : ++polls < 2 ? request('running') : request('succeeded', 42),
    );
    await tutor.ask({kind: 'explain', sourcePostId: 7, concepts: ['b', 'a']});
    expect(tutor.getSnapshot().status).toBe('waiting');
    expect(calls[0]).toMatchObject({
      path: '/groups/rooms/room/session/tutor/requests',
      json: {kind: 'explain', source_post_id: 7, concepts: ['b', 'a']},
      headers: {'Idempotency-Key': 'key-1'},
    });
    await tick();
    expect(tutor.getSnapshot().status).toBe('waiting');
    await tick();
    expect(calls.at(-1)?.path).toBe('/groups/rooms/room/session/tutor/requests/r1');
    expect(tutor.getSnapshot().status).toBe('done');
    expect(posts).toStrictEqual([42]);
  });

  it('keeps the key for the same ask after a throttle and changes it for a different one', async () => {
    let answer: unknown = failure(429, 'room_tutor_throttled');
    const {tutor, calls} = setup(() => answer);
    await tutor.ask({kind: 'hint'});
    expect(tutor.getSnapshot()).toMatchObject({status: 'failed', error: 'throttled'});
    answer = request('queued');
    await tutor.ask({kind: 'hint'});
    expect(calls.map(call => call.headers?.['Idempotency-Key'])).toStrictEqual(['key-1', 'key-1']);
    tutor.stop();
    answer = failure(503);
    const next = setup(() => answer);
    await next.tutor.ask({kind: 'hint'});
    await next.tutor.ask({kind: 'explain'});
    expect(next.calls.map(call => call.headers?.['Idempotency-Key'])).toStrictEqual(['key-1', 'key-2']);
  });

  it('asks the room to refresh when Nova is off or a duel is running', async () => {
    const disabled = setup(() => failure(409, 'room_tutor_disabled'));
    await disabled.tutor.ask({kind: 'explain'});
    expect(disabled.tutor.getSnapshot().error).toBe('disabled');
    const duel = setup(() => failure(409, 'duel_in_progress'));
    await duel.tutor.ask({kind: 'explain'});
    expect(duel.tutor.getSnapshot().error).toBe('duel');
    expect(disabled.stale() + duel.stale()).toBe(2);
  });

  it('ends on a failed or cancelled request and starts over with a new key', async () => {
    const {tutor, calls} = setup(() => request('cancelled'));
    await tutor.ask({kind: 'explain'});
    expect(tutor.getSnapshot()).toMatchObject({status: 'failed', error: 'cancelled'});
    await tutor.ask({kind: 'explain'});
    expect(calls.map(call => call.headers?.['Idempotency-Key'])).toStrictEqual(['key-1', 'key-2']);
  });
});
