import type {RouteObject} from 'react-router';
import type {KeyValueStorage} from '../lib/types';

/**
 * The first import of each lazy screen transforms Astryx and StyleX on a cold cache, which can take longer
 * than one test's 5 s budget when files run in parallel. Call it from `beforeAll` with a long hook timeout,
 * so that cost is paid once and each test measures behaviour only.
 */
export async function preloadLazyRoutes(routes: RouteObject[]): Promise<void> {
  await Promise.all(
    routes.map(async route => {
      if (typeof route.lazy === 'function') await route.lazy();
      if (route.children) await preloadLazyRoutes(route.children);
    }),
  );
}

export const PRELOAD_TIMEOUT = 120_000;

export const memoryStorage = (token: string | null = null): KeyValueStorage & {items: Map<string, string>} => {
  const items = new Map<string, string>(token ? [['ednova-token', token]] : []);
  return {
    items,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: key => void items.delete(key),
  };
};

type Respond = (method: string, path: string) => Response;

export const signedInBackend =
  (pseudo = 'eleve01', language: 'fr' | 'en' = 'fr'): Respond =>
  (_method, path) => {
    if (path === '/auth/me') return Response.json({pseudo});
    if (path === '/me/profile') return Response.json({reply_language: language});
    return Response.json({in_progress: false, planned_end: null});
  };

export function stubFetch(respond: Respond) {
  const calls: string[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    const path = url.slice(4);
    calls.push(`${init.method} ${path}`);
    return respond(init.method ?? 'GET', path);
  };
  return {calls, fetchImpl};
}
