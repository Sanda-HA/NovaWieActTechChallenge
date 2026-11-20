// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {capturePendingCode, createRoomsStore, inviteLink, normalizeCode} from './rooms-store';
import type {Api, RequestOptions, Room} from './types';

const room = (id: string, extra: Partial<Room> = {}): Room => ({id, name:'Salle ' + id, owner:false, members:['a'], invite_code:'K7M2QX', ...extra});
const failure = (status: number) => Object.assign(new Error('API request failed'), {status});

function setup(handler: (method: string, path: string, options?: RequestOptions) => unknown) {
  const calls: [string, string, unknown][] = [];
  const values = new Map<string, string>();
  const storage = {getItem:(key: string) => values.get(key) ?? null, setItem:(key: string, value: string) => values.set(key, value), removeItem:(key: string) => values.delete(key)};
  const api = {async request(method: string, path: string, options: RequestOptions = {}) {
    calls.push([method, path, options.json]);
    return handler(method, path, options);
  }};
  return {store:createRoomsStore(api as unknown as Api, {storage}), calls, storage, values};
}

describe('rooms store', () => {
  it('codes are normalised and checked before any request', async () => {
    expect(normalizeCode(' k7m-2qx ')).toBe('K7M2QX');
    const {store, calls} = setup(() => room('r1'));
    await store.join('K7M2Q0');
    expect(store.getSnapshot().joinError).toMatch(/bon format/);
    expect(calls.length).toBe(0);
    await store.join('k7m 2qx');
    expect(calls[0]).toStrictEqual(['POST', '/groups/rooms/join', {code:'K7M2QX'}]);
    expect(store.getSnapshot().selectedId).toBe('r1');
    expect(store.getSnapshot().joinError).toBe(null);
  });

  it('join failures explain what to do', async () => {
    const cases: [number, RegExp][] = [[404, /n’existe pas/], [422, /bon format/], [503, /pour le moment/]];
    for (const [status, pattern] of cases) {
      const {store} = setup(() => { throw failure(status); });
      await store.join('K7M2QX');
      expect(store.getSnapshot().joinError).toMatch(pattern);
    }
  });

  it('joining a room again says so and opens it', async () => {
    const {store} = setup(() => room('r1', {already_member:true}));
    await store.join('K7M2QX');
    expect(store.getSnapshot().notice).toMatch(/déjà dans cette salle/);
  });

  it('the selected room survives a reload of the list but not its removal', async () => {
    let rooms = [room('r1'), room('r2')];
    const {store} = setup(() => rooms);
    await store.load();
    store.select('r2');
    await store.load();
    expect(store.getSnapshot().selectedId).toBe('r2');
    rooms = [room('r1')];
    await store.load();
    expect(store.getSnapshot().selectedId).toBe('');
  });

  it('a closed room is dropped with a notice', async () => {
    const {store} = setup(() => [room('r1')]);
    await store.load();
    store.select('r1');
    store.gone('r1');
    expect(store.getSnapshot().selectedId).toBe('');
    expect(store.getSnapshot().rooms).toStrictEqual([]);
    expect(store.getSnapshot().notice).toMatch(/fermée/);
  });

  it('leaving a room that is already gone still removes it', async () => {
    const {store} = setup((method) => {
      if (method === 'GET') return [room('r1')];
      throw failure(404);
    });
    await store.load();
    await store.leave(room('r1'));
    expect(store.getSnapshot().rooms).toStrictEqual([]);
    expect(store.getSnapshot().error).toBe(null);
  });

  it('an invite link stores its code until sign-in and cleans the address', () => {
    const values = new Map<string, string>();
    const storage = {getItem:(key: string) => values.get(key) ?? null, setItem:(key: string, value: string) => values.set(key, value), removeItem:(key: string) => values.delete(key)};
    const replaced: unknown[] = [];
    capturePendingCode({hash:'#rejoindre=k7m2qx', pathname:'/live.html'}, {replaceState:(...args) => replaced.push(args[2])}, storage);
    expect(values.get('ednova-join-code')).toBe('K7M2QX');
    expect(replaced).toStrictEqual(['/live.html#bienvenue']);
    const store = createRoomsStore({} as Pick<Api, 'request'>, {storage});
    expect(store.hasPendingCode()).toBe(true);
    expect(store.takePendingCode()).toBe('K7M2QX');
    expect(store.hasPendingCode()).toBe(false);
    expect(inviteLink({origin:'http://127.0.0.1:4173', pathname:'/live.html'}, 'K7M2QX')).toBe('http://127.0.0.1:4173/live.html#rejoindre=K7M2QX');
  });

  it('a full room says how many members it takes', async () => {
    const {store} = setup(() => { throw Object.assign(failure(409), {code:'room_full'}); });
    await store.join('K7M2QX');
    expect(store.getSnapshot().joinError).toBe('Cette salle est complète (8 membres maximum).');
  });
});
