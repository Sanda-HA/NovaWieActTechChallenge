export function createApi({fetchImpl = globalThis.fetch, onExpired = () => {}} = {}) {
  let token;
  let visit = new AbortController();
  return {
    setToken(value) { token = value; },
    clear() {
      token = undefined;
      visit.abort();
      visit = new AbortController();
    },
    async request(method, path, {json, form, signal, auth = true} = {}) {
      const headers = new Headers({Accept: 'application/json'});
      if (auth && token) headers.set('Authorization', 'Bearer ' + token);
      if (json !== undefined) headers.set('Content-Type', 'application/json');
      const current = visit.signal;
      const response = await fetchImpl('/api' + path, {
        method, headers, body: json === undefined ? form : JSON.stringify(json),
        signal: signal ? AbortSignal.any([current, signal]) : current,
      });
      current.throwIfAborted();
      const body = response.status === 204 ? null : await response.json().catch(() => null);
      current.throwIfAborted();
      if (response.ok) return body;
      if (response.status === 401 && auth) onExpired();
      const delay = response.headers.get('Retry-After') ?? body?.detail?.retry_after;
      throw Object.assign(new Error('API request failed'), {
        status: response.status, code: body?.detail?.error, retryAfter: delay == null ? null : Number(delay),
      });
    },
  };
}

export async function signIn(api, {login, username, password, onCreated}) {
  if (!login) {
    await api.request('POST', '/auth/register', {auth: false, json: {pseudo: username, password}});
    onCreated();
  }
  const result = await api.request('POST', '/auth/login', {auth: false, form: new URLSearchParams({username, password})});
  if (result?.token_type !== 'bearer' || !result.access_token?.trim()) throw new Error('Invalid login response');
  api.setToken(result.access_token);
}
