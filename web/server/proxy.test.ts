// @vitest-environment node
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createApiMiddleware} from './proxy.ts';

type Seen = {method?: string; url?: string; headers: http.IncomingHttpHeaders; body: string};
type Reply = {status: number; headers: http.IncomingHttpHeaders; body: string};

const room = '3f2b8c1e-9a4d-4e7f-8b6a-1c2d3e4f5a6b';
const automaticResponseHeaders = new Set(['date', 'connection', 'keep-alive', 'transfer-encoding', 'content-length']);

let upstream: http.Server;
let front: http.Server;
let seen: Seen[];
let upstreamHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

function listen(server: http.Server): Promise<number> {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));
}

function close(server: http.Server | undefined): Promise<void> {
  if (!server?.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise(resolve => server.close(() => resolve()));
}

async function startFront(backendPort: number, timeoutMs?: number): Promise<number> {
  const middleware = createApiMiddleware({backendPort, timeoutMs});
  front = http.createServer((req, res) => middleware(req, res, () => res.writeHead(418).end('next')));
  return listen(front);
}

function send(port: number, options: {method?: string; path: string; headers?: http.OutgoingHttpHeaders; body?: string}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = http.request({host: '127.0.0.1', port, method: options.method ?? 'GET', path: options.path, headers: options.headers}, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({status: res.statusCode ?? 0, headers: res.headers, body}));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

beforeEach(async () => {
  seen = [];
  upstreamHandler = (_req, res) => {
    res.writeHead(200, {'content-type': 'application/json'}).end('{"ok":true}');
  };
  upstream = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      seen.push({method: req.method, url: req.url, headers: req.headers, body});
      upstreamHandler(req, res);
    });
  });
  await listen(upstream);
});

afterEach(async () => {
  await close(front);
  await close(upstream);
});

describe('createApiMiddleware', () => {
  it('forwards only authorization, accept, content-type and content-length upstream', async () => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    const body = '{"display_name":"Yasmine"}';
    const reply = await send(port, {
      method: 'PUT',
      path: '/api/me/profile',
      headers: {
        authorization: 'Bearer t',
        accept: 'application/json',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        cookie: 'x',
        origin: 'http://evil.test',
        'x-forwarded-for': '10.0.0.1',
        'user-agent': 'probe',
      },
      body,
    });

    expect(reply.status).toBe(200);
    expect(seen).toHaveLength(1);
    const forwarded = seen[0]!;
    expect(forwarded.method).toBe('PUT');
    expect(forwarded.url).toBe('/me/profile');
    expect(forwarded.body).toBe(body);
    expect(forwarded.headers.cookie).toBeUndefined();
    const names = Object.keys(forwarded.headers).filter(name => name !== 'host' && name !== 'connection').sort();
    expect(names).toEqual(['accept', 'authorization', 'content-length', 'content-type']);
    expect(forwarded.headers.authorization).toBe('Bearer t');
  });

  it('returns only content-type and retry-after from upstream, with cache-control: no-store', async () => {
    upstreamHandler = (_req, res) => {
      res.writeHead(429, {
        'content-type': 'application/json',
        'retry-after': '7',
        'set-cookie': 'session=1',
        'x-powered-by': 'uvicorn',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=600',
        server: 'uvicorn',
      }).end('{"detail":"slow down"}');
    };
    const port = await startFront((upstream.address() as AddressInfo).port);
    const reply = await send(port, {path: '/api/auth/me'});

    expect(reply.status).toBe(429);
    expect(reply.body).toBe('{"detail":"slow down"}');
    const names = Object.keys(reply.headers).filter(name => !automaticResponseHeaders.has(name)).sort();
    expect(names).toEqual(['cache-control', 'content-type', 'retry-after']);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers['content-type']).toBe('application/json');
    expect(reply.headers['retry-after']).toBe('7');
  });

  it('keeps only a numeric before cursor on the posts list', async () => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    await send(port, {path: `/api/groups/rooms/${room}/posts?before=5`});
    await send(port, {path: '/api/me/profile?x=1'});
    await send(port, {path: `/api/groups/rooms/${room}/posts?before=5&x=1`});

    expect(seen.map(request => request.url)).toEqual([
      `/groups/rooms/${room}/posts?before=5`,
      '/me/profile',
      `/groups/rooms/${room}/posts`,
    ]);
  });

  it('answers 503 backend_unavailable when upstream is down', async () => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    await close(upstream);
    const reply = await send(port, {path: '/api/auth/me'});

    expect(reply.status).toBe(503);
    expect(reply.body).toBe('{"detail":{"error":"backend_unavailable"}}');
    expect(reply.headers['content-type']).toBe('application/json');
    expect(reply.headers['cache-control']).toBe('no-store');
  });

  it('answers 503 backend_unavailable when upstream times out', async () => {
    upstreamHandler = () => {};
    const port = await startFront((upstream.address() as AddressInfo).port, 100);
    const reply = await send(port, {path: '/api/auth/me'});

    expect(reply.status).toBe(503);
    expect(reply.body).toBe('{"detail":{"error":"backend_unavailable"}}');
  });

  it.each([
    ['PATCH', '/api/me/profile'],
    ['GET', '/api/admin'],
    ['GET', '/api'],
    ['GET', '/api/'],
    ['GET', '/api/groups/rooms/../auth/me'],
    ['GET', '/api/groups/rooms/%2e%2e/auth/me'],
    ['DELETE', `/api/groups/rooms/${room}/members/a`],
    ['HEAD', '/api/auth/me'],
    ['OPTIONS', '/api/auth/me'],
  ])('answers 404 to %s %s without touching upstream', async (method, path) => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    const reply = await send(port, {method, path});

    expect(reply.status).toBe(404);
    expect(seen).toHaveLength(0);
  });

  it('answers 400 to a malformed /api path without touching upstream', async () => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    const reply = await send(port, {path: '/api/%E0'});

    expect(reply.status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it('passes non-/api paths to the next middleware', async () => {
    const port = await startFront((upstream.address() as AddressInfo).port);
    const reply = await send(port, {path: '/salle/x'});
    const lookalike = await send(port, {path: '/apix/auth/me'});

    expect(reply.status).toBe(418);
    expect(lookalike.status).toBe(418);
    expect(seen).toHaveLength(0);
  });
});
