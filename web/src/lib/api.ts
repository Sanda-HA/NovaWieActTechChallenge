import type {Api, ApiError, KeyValueStorage, RequestOptions, StreamOptions} from './types';

const TOKEN_KEY = 'ednova-token';

interface ErrorDetail {
  error?:string; feature?:string; retry_after?:number|string|null;
}

interface TokenResponse {
  access_token:string; token_type:string;
}

interface ApiOptions {
  fetchImpl?:(url:string, init:RequestInit) => Promise<Response>;
  onExpired?:() => void;
  onProRequired?:(feature?:string) => void;
  storage?:KeyValueStorage;
}

export interface SignInOptions {
  login:boolean; username:string; password:string; onCreated:() => void;
}

export function readField(value:unknown, key:string):unknown {
  return typeof value === 'object' && value !== null && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function detailOf(body:unknown):ErrorDetail {
  const detail = readField(body, 'detail');
  return typeof detail === 'object' && detail !== null ? (detail as ErrorDetail) : {};
}

// sessionStorage: survives a refresh, ends with the tab, and is not shared with other tabs.
export function createApi({fetchImpl = globalThis.fetch, onExpired = () => {}, onProRequired = () => {}, storage = globalThis.sessionStorage}: ApiOptions = {}): Api {
  let token: string | undefined;
  try { token = storage?.getItem(TOKEN_KEY) ?? undefined; } catch {}
  function remember(value:string|undefined) {
    token = value;
    try {
      if (value) storage?.setItem(TOKEN_KEY, value);
      else storage?.removeItem(TOKEN_KEY);
    } catch {}
  }
  let visit = new AbortController();
  async function send(method:string, path:string, {json, form, signal, auth = true, accept = 'application/json', headers:extra}:RequestOptions) {
    const headers = new Headers({Accept: accept});
    for (const [name, value] of Object.entries(extra ?? {})) headers.set(name, value);
    if (auth && token) headers.set('Authorization', 'Bearer ' + token);
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    const current = visit.signal;
    const response = await fetchImpl('/api' + path, {
      method, headers, body: json === undefined ? form : JSON.stringify(json),
      signal: signal ? AbortSignal.any([current, signal]) : current,
    });
    current.throwIfAborted();
    return {response, current};
  }
  function failure(response:Response, body:unknown, auth:boolean):ApiError {
    if (response.status === 401 && auth) onExpired();
    const detail = detailOf(body);
    if (response.status === 403 && detail.error === 'pro_required') onProRequired(detail.feature);
    const delay = response.headers.get('Retry-After') ?? detail.retry_after;
    return Object.assign(new Error('API request failed'), {
      status: response.status, code: detail.error, feature: detail.feature, retryAfter: delay == null ? null : Number(delay),
    });
  }
  return {
    setToken(value) { remember(value); },
    hasToken: () => Boolean(token),
    clear() {
      remember(undefined);
      visit.abort();
      visit = new AbortController();
    },
    async request<T = unknown>(method:string, path:string, options:RequestOptions = {}):Promise<T> {
      const {response, current} = await send(method, path, options);
      const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
      current.throwIfAborted();
      if (response.ok) return body as T;
      throw failure(response, body, options.auth ?? true);
    },
    async stream<T = unknown>(path:string, {json, signal, onEvent = () => {}}:StreamOptions):Promise<T> {
      const {response, current} = await send('POST', path, {json, signal, accept: 'text/event-stream'});
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        current.throwIfAborted();
        throw failure(response, body, true);
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: T | undefined;
      const frame = (text:string) => {
        const lines = text.split('\n');
        const kind = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!kind || !data) return;
        const body: unknown = JSON.parse(data);
        if (kind === 'error') throw Object.assign(new Error('Stream failed'), {code: readField(body, 'error') as string | undefined});
        if (kind === 'result') result = body as T;
        onEvent(kind, body);
      };
      try {
        for (let chunk; !(chunk = await reader.read()).done;) {
          current.throwIfAborted();
          buffer += decoder.decode(chunk.value, {stream: true});
          const frames = buffer.replace(/\r\n/g, '\n').split('\n\n');
          buffer = frames.pop() ?? '';
          frames.forEach(frame);
        }
        buffer += decoder.decode();
        if (buffer.trim()) frame(buffer.replace(/\r\n/g, '\n'));
      } finally {
        reader.cancel().catch(() => {});
      }
      if (result === undefined) throw Object.assign(new Error('Stream closed'), {code: 'stream_closed'});
      return result;
    },
  };
}

export async function signIn(api:Api, {login, username, password, onCreated}:SignInOptions) {
  if (!login) {
    await api.request('POST', '/auth/register', {auth: false, json: {pseudo: username, password}});
    onCreated();
  }
  const result = await api.request<Partial<TokenResponse> | null>('POST', '/auth/login', {auth: false, form: new URLSearchParams({username, password})});
  if (result?.token_type !== 'bearer' || !result.access_token?.trim()) throw new Error('Invalid login response');
  api.setToken(result.access_token);
}
