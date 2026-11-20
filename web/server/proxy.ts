import http, {type IncomingMessage, type OutgoingHttpHeaders, type ServerResponse} from 'node:http';
import {allowedEndpoint} from './routes.ts';

export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

const requestHeaders = ['authorization', 'accept', 'content-type', 'content-length', 'idempotency-key'] as const;
const responseHeaders = ['content-type', 'retry-after'] as const;
const unavailable = JSON.stringify({detail: {error: 'backend_unavailable'}});

function forward(req: IncomingMessage, res: ServerResponse, endpoint: string, backendHost: string, backendPort: number, timeoutMs: number) {
  const headers: OutgoingHttpHeaders = {};
  for (const name of requestHeaders) {
    const value = req.headers[name];
    if (typeof value === 'string' && value) headers[name] = value;
  }
  const upstream = http.request({hostname: backendHost, port: backendPort, path: endpoint, method: req.method, headers}, response => {
    const output: OutgoingHttpHeaders = {'cache-control': 'no-store'};
    for (const name of responseHeaders) {
      const value = response.headers[name];
      if (value) output[name] = value;
    }
    res.writeHead(response.statusCode ?? 502, output);
    response.pipe(res);
  });
  upstream.setTimeout(timeoutMs, () => upstream.destroy(new Error('Backend timeout')));
  upstream.on('error', () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(503, {'content-type': 'application/json', 'cache-control': 'no-store'}).end(unavailable);
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
}

export function createApiMiddleware({
  backendPort,
  backendHost = '127.0.0.1',
  timeoutMs = 65_000,
}: {
  backendPort: number;
  backendHost?: string;
  timeoutMs?: number;
}): Middleware {
  return (req, res, next) => {
    let pathname: string;
    let search: string;
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
      search = url.search;
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname !== '/api' && !pathname.startsWith('/api/')) {
      next();
      return;
    }
    const endpoint = allowedEndpoint(req.method ?? '', pathname.slice('/api'.length), search);
    if (endpoint === null) {
      res.writeHead(404, {'cache-control': 'no-store'}).end();
      return;
    }
    forward(req, res, endpoint, backendHost, backendPort, timeoutMs);
  };
}
