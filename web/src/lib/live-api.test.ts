// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createApi, signIn} from './api';
import type {KeyValueStorage} from './types';

describe('live api', () => {
  it('a failed auto-login leaves registration complete for the next attempt', async () => {
    const calls: [string, RequestInit][] = [];
    const api = createApi({fetchImpl: async (url, options) => {
      calls.push([url, options]);
      if (calls.length === 1) return Response.json({}, {status: 201});
      if (calls.length === 2) return Response.json({}, {status: 401});
      return Response.json({access_token: 'example', token_type: 'bearer'});
    }});
    let created = false;
    const submit = () => signIn(api, {login: created, username: 'eleve01', password: 'test-only', onCreated: () => {created = true;}});
    await expect(submit()).rejects.toMatchObject({status: 401});
    await submit();
    expect(calls.map(([url]) => url)).toStrictEqual(['/api/auth/register', '/api/auth/login', '/api/auth/login']);
    expect((calls[2]?.[1].body as URLSearchParams).get('username')).toBe('eleve01');
  });

  const sse = (...chunks: string[]) => new Response(new ReadableStream({start(controller) {
    const encoder = new TextEncoder();
    for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
    controller.close();
  }}), {headers: {'Content-Type': 'text/event-stream'}});

  it('stream parses frames split across chunks', async () => {
    const api = createApi({fetchImpl: async () => sse(
      'event: stage\ndata: {"stage":"sear', 'ching"}\n\nevent: result\ndata: {"answer":"ok"}\n\n')});
    const events: unknown[][] = [];
    const result = await api.stream('/tutor/sessions/s/messages/stream', {json: {message: 'q'}, onEvent: (...event) => events.push(event)});
    expect(events).toStrictEqual([['stage', {stage: 'searching'}], ['result', {answer: 'ok'}]]);
    expect(result).toStrictEqual({answer: 'ok'});
  });

  it('stream error event rejects with code', async () => {
    const api = createApi({fetchImpl: async () => sse('event: error\ndata: {"error":"agent_error"}\n\n')});
    await expect(api.stream('/x', {json: {}})).rejects.toMatchObject({code: 'agent_error'});
  });

  it('stream without a result rejects as closed', async () => {
    const api = createApi({fetchImpl: async () => sse('event: stage\ndata: {"stage":"writing"}\n\n')});
    await expect(api.stream('/x', {json: {}})).rejects.toMatchObject({code: 'stream_closed'});
  });

  it('stream shares auth and HTTP error shaping with request', async () => {
    let headers: HeadersInit | undefined;
    const api = createApi({fetchImpl: async (_url, options) => {
      headers = options.headers;
      return Response.json({detail: {error: 'busy', retry_after: 4}}, {status: 429});
    }});
    api.setToken('t');
    await expect(api.stream('/x', {json: {}})).rejects.toMatchObject({status: 429, code: 'busy', retryAfter: 4});
    expect((headers as Headers).get('Authorization')).toBe('Bearer t');
  });

  const memoryStorage = (): KeyValueStorage => {
    const items = new Map<string, string>();
    return {getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), removeItem: key => items.delete(key)};
  };
  type Call = {url: string; headers: HeadersInit | undefined};
  const okFetch = (calls: Call[] = []) => async (url: string, options: RequestInit) => {
    calls.push({url, headers: options.headers});
    return Response.json({});
  };

  it('token survives a new client on the same storage', async () => {
    const storage = memoryStorage();
    createApi({fetchImpl: okFetch(), storage}).setToken('t1');
    const calls: Call[] = [];
    const api = createApi({fetchImpl: okFetch(calls), storage});
    expect(api.hasToken()).toBe(true);
    await api.request('GET', '/auth/me');
    expect((calls[0]?.headers as Headers).get('Authorization')).toBe('Bearer t1');
  });

  it('clear removes the stored token', () => {
    const storage = memoryStorage();
    const api = createApi({fetchImpl: okFetch(), storage});
    api.setToken('t1');
    api.clear();
    expect(storage.getItem('ednova-token')).toBe(null);
    expect(api.hasToken()).toBe(false);
  });

  it('storage failure falls back to memory', () => {
    const blocked = (): never => { throw new Error('blocked'); };
    const api = createApi({fetchImpl: okFetch(), storage: {getItem: blocked, setItem: blocked, removeItem: blocked}});
    api.setToken('t1');
    expect(api.hasToken()).toBe(true);
  });
});
