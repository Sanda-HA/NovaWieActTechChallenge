import {describe, expect, it} from 'vitest';
import {betterSample, createDuelActions, createDuelDraft, formatClock, pollInterval, sampleClock, timeline, type DuelAnswer} from './duel';
import type {ApiError} from './types';

const failure = (status: number | undefined, code?: string) => Object.assign(new Error('x'), {status, code}) as ApiError;

describe('duel clock', () => {
  it('estimates the server offset from the middle of the round trip and keeps the shortest one', () => {
    const slow = sampleClock('2026-01-01T00:00:10.000Z', Date.parse('2026-01-01T00:00:00.000Z'), Date.parse('2026-01-01T00:00:02.000Z'));
    expect(slow).toEqual({offset: 9000, rtt: 2000});
    const quick = sampleClock('2026-01-01T00:00:10.000Z', Date.parse('2026-01-01T00:00:09.950Z'), Date.parse('2026-01-01T00:00:10.050Z'));
    expect(quick.offset).toBeCloseTo(0);
    expect(betterSample(slow, quick)).toBe(quick);
    expect(betterSample(quick, slow)).toBe(quick);
    expect(betterSample(null, slow)).toBe(slow);
  });

  it('renders the countdown and the deadline from the server clock, not the local one', () => {
    const view = {starts_at: '2026-01-01T00:01:00.000Z', deadline_at: '2026-01-01T00:21:00.000Z'};
    const local = Date.parse('2026-01-01T00:00:00.000Z');
    // The local clock is 30 s behind the server.
    const offset = 30_000;
    expect(timeline(view, offset, local)).toEqual({stage: 'countdown', toStart: 30_000, toDeadline: 1_230_000});
    expect(timeline(view, offset, local + 30_000).stage).toBe('running');
    expect(timeline(view, offset, local + 30_000 + 1_200_000)).toEqual({stage: 'over', toStart: 0, toDeadline: 0});
    expect(timeline({starts_at: null, deadline_at: null}, offset, local).stage).toBe('before');
  });

  it('rounds the clock up, polls slowly in the lobby and stops at the end', () => {
    expect(formatClock(61_001)).toBe('01:02');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(pollInterval('lobby')).toBeGreaterThan(pollInterval('scheduled') as number);
    expect(pollInterval('running')).toBe(1000);
    expect(pollInterval('finished')).toBe(false);
  });
});

describe('createDuelDraft', () => {
  const choice = (id: string): DuelAnswer => ({choice_id: id});
  interface Call {method: string; path: string; json?: {expected_revision?: number; answer?: DuelAnswer | null}; key?: string}

  function setup(script: (call: Call, index: number) => unknown, server: {revision: number; answers: Record<string, DuelAnswer>} = {revision: 0, answers: {}}) {
    const calls: Call[] = [];
    let keys = 0;
    let active = 0;
    let overlap = 0;
    const api = {
      request: async (method: string, path: string, options: {json?: Call['json']; headers?: Record<string, string>} = {}) => {
        const call = {method, path, json: options.json, key: options.headers?.['Idempotency-Key']};
        calls.push(call);
        active++;
        overlap = Math.max(overlap, active);
        await Promise.resolve();
        active--;
        if (method === 'GET') return {attempt_id: 'a', submitted_at: null, ...server};
        const result = script(call, calls.length - 1);
        if (result instanceof Error) throw result;
        if (call.method === 'PUT' && call.json) {
          const id = decodeURIComponent(call.path.split('/').pop()!);
          if (call.json.answer) server.answers = {...server.answers, [id]: call.json.answer};
          else delete server.answers[id];
          server.revision = (call.json.expected_revision ?? 0) + 1;
        }
        return result;
      },
    };
    const draft = createDuelDraft(api as never, 'room', 'duel', () => `key-${++keys}`);
    return {draft, calls, overlap: () => overlap};
  }

  it('saves one answer at a time, each against the revision the last save returned, and coalesces edits', async () => {
    const {draft, calls, overlap} = setup(call => ({revision: (call.json?.expected_revision ?? 0) + 1, answered_count: 1, saved_at: 'x'}));
    await draft.load();
    draft.set('q1', choice('a'));
    draft.set('q2', choice('b'));
    draft.set('q1', choice('c'));
    await draft.reload();
    const puts = calls.filter(call => call.method === 'PUT');
    expect(overlap()).toBe(1);
    expect(puts.map(call => [call.path.split('/').pop(), call.json?.expected_revision])).toEqual([['q1', 0], ['q1', 1], ['q2', 2]]);
    expect(puts.map(call => call.json?.answer)).toEqual([choice('a'), choice('c'), choice('b')]);
    expect(new Set(puts.map(call => call.key)).size).toBe(3);
    expect(draft.getSnapshot()).toMatchObject({revision: 3, unsaved: {}, confirmed: {q1: choice('c'), q2: choice('b')}});
  });

  it('keeps the key of a save that is retried unchanged after a lost response, and a fresh key for the next action', async () => {
    let attempt = 0;
    const {draft, calls} = setup(call => (++attempt === 1 ? failure(undefined) : {revision: (call.json?.expected_revision ?? 0) + 1, answered_count: 1, saved_at: 'x'}));
    await draft.load();
    draft.set('q1', choice('a'));
    await draft.reload();
    expect(draft.getSnapshot()).toMatchObject({error: 'network', unsaved: {q1: choice('a')}});
    draft.retry();
    await draft.reload();
    const puts = calls.filter(call => call.method === 'PUT');
    expect(puts).toHaveLength(2);
    expect(puts[1]?.key).toBe(puts[0]?.key);
    draft.set('q1', null);
    await draft.reload();
    expect(calls.filter(call => call.method === 'PUT')[2]?.key).not.toBe(puts[0]?.key);
  });

  it('reloads the draft on a stale revision before saving again, and never sends the old revision twice', async () => {
    const server = {revision: 0, answers: {} as Record<string, DuelAnswer>};
    let first = true;
    const {draft, calls} = setup(call => {
      if (first) {
        first = false;
        server.revision = 4;
        server.answers = {q9: choice('z')};
        return failure(409, 'stale_revision');
      }
      return {revision: (call.json?.expected_revision ?? 0) + 1, answered_count: 2, saved_at: 'x'};
    }, server);
    await draft.load();
    draft.set('q1', choice('a'));
    await draft.reload();
    const puts = calls.filter(call => call.method === 'PUT');
    expect(puts.map(call => call.json?.expected_revision)).toEqual([0, 4]);
    expect(calls.filter(call => call.method === 'GET').length).toBeGreaterThanOrEqual(2);
    expect(draft.getSnapshot()).toMatchObject({revision: 5, unsaved: {}, confirmed: {q9: choice('z'), q1: choice('a')}, error: null});
  });

  it('hands in only once the saves are done, with the latest revision, and not when one failed', async () => {
    let saveFails = true;
    const {draft, calls} = setup(call =>
      call.path.endsWith('/submit')
        ? {submitted_at: 't', duel: {}, result: null}
        : saveFails
          ? failure(500)
          : {revision: 1, answered_count: 1, saved_at: 'x'},
    );
    await draft.load();
    draft.set('q1', choice('a'));
    expect(await draft.submit()).toBeNull();
    expect(calls.some(call => call.path.endsWith('/submit'))).toBe(false);
    saveFails = false;
    const receipt = await draft.submit();
    expect(receipt?.submitted_at).toBe('t');
    const submit = calls.find(call => call.path.endsWith('/submit'));
    expect(submit?.json).toEqual({expected_revision: 1});
    expect(draft.getSnapshot().submittedAt).toBe('t');
  });
});

describe('createDuelActions', () => {
  it('reuses the key of an action that may have been applied, and drops it once the server has answered', async () => {
    const seen: (string | undefined)[] = [];
    let answers: (Error | object)[] = [failure(undefined), failure(409, 'duel_active'), {}];
    const api = {
      request: async (_method: string, _path: string, options: {headers?: Record<string, string>} = {}) => {
        seen.push(options.headers?.['Idempotency-Key']);
        const next = answers.shift()!;
        if (next instanceof Error) throw next;
        return next;
      },
    };
    let n = 0;
    const actions = createDuelActions(api as never, 'room', () => `k${++n}`);
    await actions.create('bp').catch(() => {});
    await actions.create('bp').catch(() => {});
    await actions.create('bp');
    expect(seen).toEqual(['k1', 'k1', 'k2']);
    answers = [{}];
    await actions.create('bp');
    expect(seen[3]).toBe('k3');
  });
});
