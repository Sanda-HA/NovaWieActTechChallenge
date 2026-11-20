type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Copied verbatim from the retired ui-preview/scripts/serve.mjs:14-19.
export const routes: Record<Method, RegExp> = {
  GET: /^\/(auth\/me|learning\/(diagnostic|progress|mind-maps(?:\/[a-z0-9_]{1,40})?|group-review|sample-quiz|quiz\/[a-z0-9_]{1,40}|interactive-lab\/[a-z0-9_]{1,40}|bac-practice\/derivabilite)|topics|me\/profile|study\/(?:summary|sessions)|groups\/rooms(?:\/[a-f0-9-]{36}(?:\/(?:posts|consent)|\/session(?:\/(?:quiz|insights)|\/tutor\/requests\/[a-f0-9-]{36})?|\/duels(?:\/(?:blueprints|[a-f0-9-]{36}(?:\/(?:exam|attempt|result))?))?)?)?)$/,
  POST: /^\/(auth\/(register|login)|me\/pro-request|learning\/(?:diagnostic|mistake-practice|mind-maps\/[a-z0-9_]{1,40}|revision-pack\/derivabilite|revision-demo\/completion|quiz\/[a-f0-9-]{36}\/answers)|study\/(start|stop)|groups\/(demo\/check|rooms(?:\/join|\/[a-f0-9-]{36}\/(?:check|posts|owner|session(?:\/next|\/end|\/tutor\/requests)?|duels(?:\/join|\/[a-f0-9-]{36}\/(?:accept|withdraw|attempt\/submit))?))?)|tutor\/(sessions|feedback|sessions\/[a-f0-9-]{36}\/messages(?:\/stream)?))$/,
  PUT: /^\/(me\/profile|groups\/rooms\/[a-f0-9-]{36}\/(?:session\/posts\/\d{1,10}\/helpfulness|duels\/[a-f0-9-]{36}\/(?:ready|attempt\/answers\/[a-f0-9]{32})))$/,
  PATCH: /^\/groups\/rooms\/[a-f0-9-]{36}\/(?:settings|consent)$/,
  DELETE: /^\/(auth\/me|me\/pro-request|groups\/rooms\/[a-f0-9-]{36}(?:\/members\/[A-Za-z0-9]{3,30})?)$/,
};

const pagedPosts = /\/posts$/;
const beforeCursor = /^\?before=\d{1,12}$/;

export function allowedEndpoint(method: string, pathname: string, search: string): string | null {
  if (!Object.hasOwn(routes, method)) return null;
  if (!routes[method as Method].test(pathname)) return null;
  // Only the posts list takes a query string, and only a numeric page cursor.
  const paged = method === 'GET' && pagedPosts.test(pathname) && beforeCursor.test(search);
  return paged ? pathname + search : pathname;
}
