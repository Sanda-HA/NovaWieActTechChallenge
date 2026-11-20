// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createStudyTimer} from './study-timer';
import type {Api, RequestOptions, StudySummary} from './types';

interface FakeApi {
  summary: StudySummary;
  stopStatus?: number;
  request(method: string, path: string, options?: RequestOptions): Promise<unknown>;
}

function setup({summary = {in_progress:false, planned_end:null}, saved = null}: {summary?: StudySummary; saved?: unknown} = {}) {
  const calls: [string, string, unknown][] = [];
  const clock = {now:1_000_000};
  const store = new Map<string, string>(saved ? [['ednova-study-timer', JSON.stringify(saved)]] : []);
  const storage = {getItem:(key: string) => store.get(key) ?? null, setItem:(key: string, value: string) => store.set(key, value), removeItem:(key: string) => store.delete(key)};
  const api: FakeApi = {
    summary,
    async request(method: string, path: string, options: RequestOptions = {}) {
      calls.push([method, path, options.json]);
      if (path === '/study/summary') return api.summary;
      if (path === '/study/stop' && api.stopStatus) throw Object.assign(new Error('stop'), {status:api.stopStatus});
      return {};
    },
  };
  const timer = createStudyTimer(api as unknown as Api, {now:() => clock.now, storage});
  return {timer, calls, clock, store, api};
}

describe('study timer', () => {
  it('start, pause and resume record only running time on the server', async () => {
    const {timer, calls, clock} = setup();
    await timer.attach('eleve01');
    await timer.start();
    expect(calls.find(([, path]) => path === '/study/start')?.[2]).toStrictEqual({minutes:25});
    clock.now += 10 * 60000;
    await timer.pause();
    expect(timer.getSnapshot().phase).toBe('paused');
    expect(timer.remaining()).toBe(15 * 60000);
    clock.now += 60 * 60000;
    expect(timer.remaining()).toBe(15 * 60000);
    await timer.start();
    expect(calls.filter(([, path]) => path === '/study/start').map(([, , json]) => json)).toStrictEqual([{minutes:25}, {minutes:15}]);
    expect(timer.getSnapshot().announcement).toBe('Séance en cours.');
  });

  it('a stop rejected because the server already closed the session still pauses', async () => {
    const {timer, api} = setup();
    await timer.attach('eleve01');
    await timer.start();
    api.stopStatus = 409;
    await timer.pause();
    expect(timer.getSnapshot().phase).toBe('paused');
    expect(timer.getSnapshot().error).toBe(null);
  });

  it('completing the countdown resets to the chosen length', async () => {
    const {timer, clock} = setup();
    await timer.attach('eleve01');
    timer.setDuration(45);
    await timer.start();
    clock.now += 45 * 60000;
    await timer.complete();
    const state = timer.getSnapshot();
    expect(state.phase).toBe('done');
    expect(state.remainingMs).toBe(45 * 60000);
    expect(state.announcement).toMatch(/terminée/);
  });

  it('a break after a finished block counts down without touching the server', async () => {
    const {timer, calls, clock} = setup();
    await timer.attach('eleve01');
    await timer.start();
    clock.now += 25 * 60000;
    await timer.complete();
    const before = calls.length;
    timer.startBreak();
    expect(timer.getSnapshot().phase).toBe('break');
    expect(timer.remaining()).toBe(5 * 60000);
    clock.now += 2 * 60000;
    expect(timer.remaining()).toBe(3 * 60000);
    timer.setDuration(45);
    expect(timer.getSnapshot().durationMs).toBe(25 * 60000);
    clock.now += 3 * 60000;
    await timer.complete();
    expect(timer.getSnapshot().phase).toBe('idle');
    expect(timer.remaining()).toBe(25 * 60000);
    expect(calls.slice(before).some(([, path]) => path === '/study/start' || path === '/study/stop')).toBe(false);
  });

  it('a break can only start after a finished block, and can be skipped', async () => {
    const {timer, clock} = setup();
    await timer.attach('eleve01');
    timer.startBreak();
    expect(timer.getSnapshot().phase).toBe('idle');
    await timer.start();
    clock.now += 25 * 60000;
    await timer.complete();
    timer.skipBreak();
    expect(timer.getSnapshot().phase).toBe('idle');
    await timer.start();
    clock.now += 25 * 60000;
    await timer.complete();
    timer.startBreak();
    timer.skipBreak();
    expect(timer.getSnapshot().phase).toBe('idle');
    expect(timer.getSnapshot().announcement).toBe('Pause passée.');
  });

  it('the length can only change while the timer is idle', async () => {
    const {timer} = setup();
    await timer.attach('eleve01');
    timer.setDuration(0);
    expect(timer.getSnapshot().durationMs).toBe(25 * 60000);
    await timer.start();
    timer.setDuration(45);
    expect(timer.getSnapshot().durationMs).toBe(25 * 60000);
  });

  it('after a refresh the running server session is adopted', async () => {
    const {timer, clock} = setup({summary:{in_progress:true, planned_end:new Date(1_000_000 + 12 * 60000).toISOString()}});
    await timer.attach('eleve01');
    const state = timer.getSnapshot();
    expect(state.phase).toBe('running');
    expect(timer.remaining()).toBe(12 * 60000);
    clock.now += 2 * 60000;
    expect(timer.remaining()).toBe(10 * 60000);
  });

  it('a paused countdown is restored only for the same learner', async () => {
    const saved = {owner:'eleve01', phase:'paused', durationMs:25 * 60000, remainingMs:7 * 60000, endsAt:null};
    const mine = setup({saved});
    await mine.timer.attach('eleve01');
    expect(mine.timer.remaining()).toBe(7 * 60000);
    const other = setup({saved});
    await other.timer.attach('eleve02');
    expect(other.timer.getSnapshot().phase).toBe('idle');
    expect(other.timer.remaining()).toBe(25 * 60000);
  });

  it('a stopwatch session left open by the former timer is closed', async () => {
    const {timer, calls} = setup({summary:{in_progress:true, planned_end:null}});
    await timer.attach('eleve01');
    expect(calls.some(([, path]) => path === '/study/stop')).toBe(true);
    expect(timer.getSnapshot().phase).toBe('idle');
  });

  it('a session that ended while signed out shows as done', async () => {
    const saved = {owner:'eleve01', phase:'running', durationMs:25 * 60000, remainingMs:25 * 60000, endsAt:1_000_000 - 1};
    const {timer} = setup({saved});
    await timer.attach('eleve01');
    expect(timer.getSnapshot().phase).toBe('done');
  });

  it('clear forgets the saved countdown', async () => {
    const {timer, store} = setup();
    await timer.attach('eleve01');
    await timer.start();
    timer.clear();
    expect(store.size).toBe(0);
    expect(timer.getSnapshot().phase).toBe('idle');
  });
});
