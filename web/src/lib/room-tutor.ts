import type {Api, ApiError} from './types';

export type TutorKind = 'explain' | 'hint';

export interface TutorAsk {
  kind:TutorKind; sourcePostId?:number|null; concepts?:string[];
}

export interface TutorRequest {
  id:string; kind:string; state:'queued'|'running'|'succeeded'|'failed'|'cancelled'; created_at:string; result_post_id:number|null;
}

export type TutorErrorCode =
  'disabled'|'duel'|'throttled'|'pro_required'|'source'|'concepts'|'conflict'|'busy'|'failed'|'cancelled'|'unavailable';

export interface TutorState {
  status:'idle'|'sending'|'waiting'|'done'|'failed';
  error:TutorErrorCode|null;
  retryAfter:number|null;
  request:TutorRequest|null;
}

interface TutorOptions {
  /** The room state may have changed (Nova switched off, a duel started, the plan changed): read it again. */
  onStale?():unknown;
  /** The request succeeded; the resulting post is in the feed under this ID. */
  onPost?(postId:number|null):unknown;
  interval?:number;
  maxInterval?:number;
  setTimer?(callback:() => unknown, delay:number):unknown;
  clearTimer?(handle:unknown):void;
  newKey?():string;
}

const initial:TutorState = {status:'idle', error:null, retryAfter:null, request:null};
const FINAL = new Set(['succeeded', 'failed', 'cancelled']);
const MAX_POLL_FAILURES = 5;

const describe = (error:unknown):TutorErrorCode => {
  const failure = error as ApiError;
  switch (failure.code) {
    case 'pro_required': return 'pro_required';
    case 'room_tutor_disabled': return 'disabled';
    case 'duel_in_progress': return 'duel';
    case 'room_tutor_throttled': return 'throttled';
    case 'tutor_source_not_found': return 'source';
    case 'invalid_tutor_concepts': return 'concepts';
    case 'idempotency_key_conflict': return 'conflict';
  }
  return failure.status === 429 ? 'throttled' : failure.status === 503 ? 'busy' : 'unavailable';
};

const STALE:readonly TutorErrorCode[] = ['disabled', 'duel', 'pro_required', 'source'];

export const fingerprint = ({kind, sourcePostId, concepts = []}:TutorAsk) =>
  JSON.stringify([kind, sourcePostId ?? null, [...new Set(concepts)].sort()]);

/**
 * "Ask Nova" in a session: one request at a time. The `Idempotency-Key` stays the same while the same ask is retried
 * (a lost response, a throttle, a busy backend) and changes once the request is over or the ask is different.
 */
export function createRoomTutor(api:Pick<Api, 'request'>, roomId:string, {
  onStale, onPost, interval = 1500, maxInterval = 5000,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
  newKey = () => globalThis.crypto.randomUUID(),
}:TutorOptions = {}) {
  const base = '/groups/rooms/' + roomId + '/session/tutor/requests';
  const listeners = new Set<() => void>();
  let state = initial;
  let serial = 0;
  let timer:unknown = null;
  let pending:{print:string; key:string}|null = null;

  const publish = (patch:Partial<TutorState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  function settle(request:TutorRequest) {
    pending = null;
    if (request.state === 'succeeded') {
      publish({status:'done', request, error:null});
      void onPost?.(request.result_post_id);
    } else publish({status:'failed', request, error:request.state === 'cancelled' ? 'cancelled' : 'failed'});
  }

  function poll(mine:number, id:string, delay:number, failures:number) {
    timer = setTimer(async () => {
      timer = null;
      try {
        const request = await api.request<TutorRequest>('GET', base + '/' + id);
        if (mine !== serial) return;
        if (FINAL.has(request.state)) settle(request);
        else {
          publish({request});
          poll(mine, id, Math.min(delay * 1.5, maxInterval), 0);
        }
      } catch (error) {
        if (mine !== serial || (error as ApiError).name === 'AbortError') return;
        const code = describe(error);
        const gone = (error as ApiError).status === 404;
        if (code === 'pro_required' || gone || failures + 1 >= MAX_POLL_FAILURES) {
          pending = null;
          publish({status:'failed', error:gone ? 'failed' : code});
          if (STALE.includes(code)) void onStale?.();
        } else poll(mine, id, Math.min(delay * 1.5, maxInterval), failures + 1);
      }
    }, delay);
  }

  return {
    getSnapshot:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async ask(ask:TutorAsk) {
      if (state.status === 'sending' || state.status === 'waiting') return;
      const print = fingerprint(ask);
      if (pending?.print !== print) pending = {print, key:newKey()};
      const mine = ++serial;
      cancelTimer();
      publish({status:'sending', error:null, retryAfter:null, request:null});
      try {
        const request = await api.request<TutorRequest>('POST', base, {
          json:{
            kind:ask.kind,
            ...(ask.sourcePostId ? {source_post_id:ask.sourcePostId} : {}),
            ...(ask.concepts?.length ? {concepts:ask.concepts} : {}),
          },
          headers:{'Idempotency-Key':pending.key},
        });
        if (mine !== serial) return;
        if (FINAL.has(request.state)) settle(request);
        else {
          publish({status:'waiting', request});
          poll(mine, request.id, interval, 0);
        }
      } catch (error) {
        if (mine !== serial) return;
        if ((error as ApiError).name === 'AbortError') {
          publish(initial);
          return;
        }
        const code = describe(error);
        if (code === 'conflict') pending = null;
        publish({status:'failed', error:code, retryAfter:(error as ApiError).retryAfter ?? null});
        if (STALE.includes(code)) void onStale?.();
      }
    },
    /** Forgets the outcome of a finished ask; a request still in flight keeps going. */
    dismiss() {
      if (state.status === 'sending' || state.status === 'waiting') return;
      publish(initial);
    },
    stop() {
      serial++;
      cancelTimer();
    },
  };
}
