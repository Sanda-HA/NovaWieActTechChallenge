// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createApi} from './api';
import {restoreSession} from './session-restore';
import type {Api, KeyValueStorage} from './types';

const memoryStorage = (token: string | null): KeyValueStorage => {
  const items = new Map<string, string>(token ? [['ednova-token', token]] : []);
  return {getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), removeItem: key => items.delete(key)};
};

function setup(token: string | null, respond: (path: string) => Response) {
  const calls: [string | undefined, string][] = [];
  const storage = memoryStorage(token);
  let api: Api;
  api = createApi({storage, onExpired: () => api.clear(), fetchImpl: async (url, options) => {
    calls.push([options.method, url.slice(4)]);
    return respond(url.slice(4));
  }});
  return {api, calls, storage};
}

describe('session restore', () => {
  it('no token makes no request', async () => {
    const {api, calls} = setup(null, () => Response.json({}));
    expect(await restoreSession(api)).toBe(null);
    expect(calls).toStrictEqual([]);
  });

  it('valid token returns pseudo and profile', async () => {
    const {api, calls} = setup('t1', path => Response.json(path === '/auth/me' ? {pseudo: 'eleve01'} : {reply_language: 'en'}));
    expect(await restoreSession(api)).toStrictEqual({pseudo: 'eleve01', profile: {reply_language: 'en'}});
    expect(calls).toStrictEqual([['GET', '/auth/me'], ['GET', '/me/profile']]);
  });

  it('unreachable backend keeps the token', async () => {
    const {api} = setup('t1', () => Response.json({detail: {error: 'backend_unavailable'}}, {status: 503}));
    expect(await restoreSession(api)).toBe(null);
    expect(api.hasToken()).toBe(true);
  });

  it('expired token clears storage', async () => {
    const {api, storage} = setup('t1', () => Response.json({}, {status: 401}));
    expect(await restoreSession(api)).toBe(null);
    expect(storage.getItem('ednova-token')).toBe(null);
    expect(api.hasToken()).toBe(false);
  });
});
