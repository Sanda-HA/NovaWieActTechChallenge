import {randomBytes} from 'node:crypto';
import type {ServerResponse} from 'node:http';
import type {Plugin} from 'vite';
import {cspHeader} from './csp.ts';
import {createApiMiddleware, type Middleware} from './proxy.ts';

// Vite writes html.cspNonce verbatim into every <script>/<style> tag and the csp-nonce
// <meta>; the server must swap it for a fresh value on each request.
const noncePlaceholder = '__EDNOVA_CSP_NONCE__';

export function backendPortFromEnv(value: string | undefined): number {
  const port = Number(value ?? 9999);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('EDNOVA_BACKEND_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

const devCsp: Middleware = (req, res, next) => {
  const nonce = randomBytes(16).toString('base64');
  res.setHeader('content-security-policy', cspHeader('dev', nonce));
  // A cached page carries an old nonce that no longer matches the header.
  if (req.headers.accept?.includes('text/html')) delete req.headers['if-none-match'];
  const end = res.end.bind(res) as (...args: unknown[]) => ServerResponse;
  res.end = ((chunk?: unknown, ...rest: unknown[]) => {
    if (res.headersSent || !String(res.getHeader('content-type') ?? '').startsWith('text/html')) return end(chunk, ...rest);
    res.removeHeader('etag');
    res.setHeader('cache-control', 'no-store');
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) return end(chunk, ...rest);
    const body = chunk.toString().replaceAll(noncePlaceholder, nonce);
    if (res.hasHeader('content-length')) res.setHeader('content-length', Buffer.byteLength(body));
    return end(body, ...rest);
  }) as ServerResponse['end'];
  next();
};

const prodCsp: Middleware = (_req, res, next) => {
  res.setHeader('content-security-policy', cspHeader('prod'));
  next();
};

export function ednovaServer({backendPort, backendHost}: {backendPort: number; backendHost?: string}): Plugin {
  const api = createApiMiddleware({backendPort, backendHost});
  return {
    name: 'ednova-server',
    config(_config, {command, isPreview}) {
      if (command === 'serve' && !isPreview) return {html: {cspNonce: noncePlaceholder}};
    },
    configureServer(server) {
      server.middlewares.use(api);
      server.middlewares.use(devCsp);
    },
    configurePreviewServer(server) {
      server.middlewares.use(api);
      server.middlewares.use(prodCsp);
    },
  };
}
