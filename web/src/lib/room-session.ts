import type {Api, ApiError, Room} from './types';

export interface RoundSession {
  session_id:number; topic:string; goal:string; round:string; notes:string[]; my_open_points:string[];
}

export interface RoomPost {
  id:string; kind:string; text:string; author:string|null; verdict:string|null; format?:'step_by_step'|'examples'|'visual'|'analogy'|null;
}

export interface RoomSessionError {
  code:'busy'|'pro_required'|'forbidden'|'conflict'|'unknown_topic'|'unavailable'; retryAfter:number|null;
}

export interface RoomSessionState {
  status:'loading'|'active'|'ended'|'none'|'locked'|'gone';
  session:RoundSession|null;
  posts:RoomPost[]|null;
  room:Room|null;
  busy:boolean;
  error:RoomSessionError|null;
}

interface RoomSessionOptions {
  interval?:number;
  setTimer?(callback:() => unknown, delay:number):unknown;
  clearTimer?(handle:unknown):void;
}

const initial:RoomSessionState = {status:'loading', session:null, posts:null, room:null, busy:false, error:null};

const describe = (error:unknown):RoomSessionError => {
  const failure = error as ApiError;
  return {
    code: failure.code === 'pro_required' ? 'pro_required'
      : failure.status === 503 ? 'busy'
      : failure.status === 403 ? 'forbidden'
      : failure.status === 409 ? 'conflict'
      : failure.status === 404 && failure.code === 'unknown_topic' ? 'unknown_topic' : 'unavailable',
    retryAfter: failure.retryAfter ?? null,
  };
};

// Polls bring back the newest page only; posts loaded with "earlier messages" must survive them.
export function mergePosts<T extends {id:string}>(page:T[], existing:T[]):T[] {
  const byId = new Map(existing.map(post => [post.id, post] as const));
  for (const post of page) byId.set(post.id, post);
  return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
}

export function createRoomSession(api:Pick<Api, 'request'>, roomId:string, {
  interval = 5000,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = handle => clearTimeout(handle as number),
}:RoomSessionOptions = {}) {
  const base = '/groups/rooms/' + roomId;
  const listeners = new Set<() => void>();
  let state = initial;
  let serial = 0;
  let polling = false;
  let timer:unknown = null;

  const publish = (patch:Partial<RoomSessionState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };

  function schedule() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    // Keeps polling after a session ends: members must see the owner start the next one.
    if (polling && state.status !== 'gone') {
      timer = setTimer(() => {
        timer = null;
        return refresh();
      }, interval);
    }
  }

  // Members who join between polls would otherwise stay invisible to the others; a failure here is not
  // worth surfacing over the session view.
  async function loadRoom(mine:number) {
    try {
      const room = await api.request<Room>('GET', base);
      if (mine === serial) publish({room});
    } catch {}
  }

  // A Free learner reads the session only while the room owner has Pro; otherwise the server answers 403
  // pro_required and the learner still reads the room's posts. Once locked,
  // polls skip the session read, so a stale plan does not turn into a 403 every few seconds.
  async function lock(mine:number) {
    let posts = state.posts;
    try { posts = await api.request<RoomPost[]>('GET', base + '/posts'); } catch {}
    if (mine === serial) publish({status:'locked', session:null, posts, error:null});
  }

  async function refresh() {
    const mine = ++serial;
    try {
      if (state.status === 'locked') {
        await lock(mine);
        await loadRoom(mine);
        schedule();
        return;
      }
      const session = await api.request<RoundSession>('GET', base + '/session');
      const posts = await api.request<RoomPost[]>('GET', base + '/posts');
      if (mine !== serial) return;
      publish({status:session.round === 'ended' ? 'ended' : 'active', session, posts, error:null});
    } catch (error) {
      const failure = error as ApiError;
      if (mine !== serial || failure.name === 'AbortError') return;
      if (failure.code === 'pro_required') await lock(mine);
      else if (failure.status === 404 && failure.code === 'room_not_found') publish({status:'gone', session:null, error:null});
      else if (failure.status === 404) publish({status:'none', session:null, error:null});
      else publish({error:describe(error)});
    }
    await loadRoom(mine);
    schedule();
  }

  async function act(method:string, path:string, json?:unknown) {
    if (state.busy) return;
    publish({busy:true, error:null});
    try {
      await api.request(method, base + path, json === undefined ? {} : {json});
    } catch (error) {
      const failure = error as ApiError;
      if (failure.name === 'AbortError') {
        publish({busy:false});
        return;
      }
      const described = describe(error);
      publish({busy:false});
      if (described.code === 'pro_required') {
        await lock(++serial);
        return;
      }
      if (failure.status === 409) await refresh();
      publish({error:described});
      return;
    }
    publish({busy:false});
    await refresh();
  }

  return {
    getSnapshot:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
    /** The plan became Pro: read the session again. */
    unlock() {
      if (state.status === 'locked') publish({status:'loading'});
      return refresh();
    },
    start:(topic:string) => act('POST', '/session', {topic}),
    next:() => act('POST', '/session/next'),
    end:() => act('POST', '/session/end'),
    removeMember:(pseudo:string) => act('DELETE', '/members/' + encodeURIComponent(pseudo)),
    transferOwner:(pseudo:string) => act('POST', '/owner', {pseudo}),
    startPolling() {
      polling = true;
      if (timer === null) schedule();
    },
    stopPolling() {
      polling = false;
      serial++;
      schedule();
    },
  };
}
