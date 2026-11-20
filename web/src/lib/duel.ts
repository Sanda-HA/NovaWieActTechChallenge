import type {Api, ApiError} from './types';

export type DuelPhase = 'invited' | 'lobby' | 'scheduled' | 'running' | 'grading' | 'finished' | 'expired' | 'cancelled';
export type SubmissionState = 'open' | 'submitted' | 'deadline' | 'forfeit';

export interface DuelPlayer {
  slot: 1 | 2;
  pseudo: string | null;
  ready: boolean;
  answered_count: number;
  submission_state: SubmissionState;
}

export interface DuelView {
  duel_id: string;
  blueprint_id: string;
  topic: string;
  language: string;
  status: DuelPhase;
  version: number;
  server_now: string;
  invite_expires_at: string;
  ready_expires_at: string | null;
  starts_at: string | null;
  deadline_at: string | null;
  my_slot: 1 | 2 | null;
  players: DuelPlayer[];
  invite_code?: string | null;
}

export interface Blueprint {
  id: string;
  topic: string;
  language: string;
  duration_seconds: number;
  item_count: number;
}

export interface ExamQuestion {
  id: string;
  kind: 'choice' | 'number' | 'text';
  prompt: string;
  choices: {id: string; text: string}[];
  points: number;
}

export interface Exam {
  exam_id: string;
  language: string;
  questions: ExamQuestion[];
}

export type DuelAnswer = {choice_id: string} | {value: string};

export interface Attempt {
  attempt_id: string;
  revision: number;
  answers: Record<string, DuelAnswer>;
  submitted_at: string | null;
}

export interface ResultSummary {
  outcome: 'win' | 'draw' | 'forfeit' | 'void';
  reason: string;
  winner_slot: 1 | 2 | null;
  scores: Record<string, number>;
  finalized_at: string;
}

export interface Correction {
  question_id: string;
  concept: string;
  correct: boolean;
  points: number;
  max_points: number;
}

export interface DuelResult extends ResultSummary {
  my_corrections: Correction[];
  debrief_status: 'pending' | 'ready' | 'skipped' | 'failed';
  debrief: string | null;
}

export interface SubmitReceipt {
  submitted_at: string;
  duel: DuelView;
  result: ResultSummary | null;
}

/** `GET …/result` answers 202 `{status}` while the duel is not finished. */
export const isResult = (body: DuelResult | {status: DuelPhase}): body is DuelResult => 'outcome' in body;

export const CLOSED: readonly DuelPhase[] = ['expired', 'cancelled'];
export const isOver = (status: DuelPhase) => status === 'finished' || CLOSED.includes(status);

// ---- clock ----

export interface ClockSample {
  /** Server time minus local time, in ms. */
  offset: number;
  /** Round trip of the request that gave the sample, in ms. */
  rtt: number;
}

/** The server stamped `server_now` somewhere between send and receive; assume the middle. */
export function sampleClock(serverNow: string, sentAt: number, receivedAt: number): ClockSample {
  return {offset: Date.parse(serverNow) - (sentAt + receivedAt) / 2, rtt: Math.max(0, receivedAt - sentAt)};
}

/** The sample with the shortest round trip is the least uncertain. */
export const betterSample = (previous: ClockSample | null, next: ClockSample): ClockSample =>
  previous && previous.rtt <= next.rtt ? previous : next;

export type Stage = 'before' | 'countdown' | 'running' | 'over';

export interface Timeline {
  stage: Stage;
  /** Time left before the start, in ms (0 once started). */
  toStart: number;
  /** Time left before the deadline, in ms (0 once over). */
  toDeadline: number;
}

export function timeline(view: Pick<DuelView, 'starts_at' | 'deadline_at'>, offset: number, localNow: number): Timeline {
  if (!view.starts_at || !view.deadline_at) return {stage: 'before', toStart: 0, toDeadline: 0};
  const now = localNow + offset;
  const toStart = Math.max(0, Date.parse(view.starts_at) - now);
  const toDeadline = Math.max(0, Date.parse(view.deadline_at) - now);
  return {stage: toStart > 0 ? 'countdown' : toDeadline > 0 ? 'running' : 'over', toStart, toDeadline};
}

/** mm:ss, rounded up so that "00:00" only shows when time is really out. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** How often the duel view is read: slowly while nobody is playing, every second once a start is set. */
export function pollInterval(status: DuelPhase): number | false {
  switch (status) {
    case 'invited':
    case 'lobby':
      return 3000;
    case 'scheduled':
    case 'running':
    case 'grading':
      return 1000;
    default:
      return false;
  }
}

// ---- errors ----

export type DuelErrorCode =
  | 'pro_required'
  | 'opponent_unavailable'
  | 'active'
  | 'self'
  | 'invite_missing'
  | 'invite_expired'
  | 'invite_closed'
  | 'lobby_closed'
  | 'closed'
  | 'not_running'
  | 'locked'
  | 'stale'
  | 'invalid_answer'
  | 'rate_limited'
  | 'code_unavailable'
  | 'key_reused'
  | 'not_found'
  | 'network'
  | 'unavailable';

const BY_CODE: Record<string, DuelErrorCode> = {
  pro_required: 'pro_required',
  duel_opponent_unavailable: 'opponent_unavailable',
  duel_active: 'active',
  cannot_invite_self: 'self',
  duel_invite_not_found: 'invite_missing',
  duel_invite_expired: 'invite_expired',
  duel_lobby_expired: 'invite_expired',
  duel_invite_closed: 'invite_closed',
  duel_lobby_closed: 'lobby_closed',
  duel_closed: 'closed',
  duel_not_running: 'not_running',
  attempt_locked: 'locked',
  stale_revision: 'stale',
  invalid_duel_answer: 'invalid_answer',
  duel_code_rate_limited: 'rate_limited',
  duel_code_unavailable: 'code_unavailable',
  idempotency_key_reused: 'key_reused',
  duel_not_found: 'not_found',
};

export function describeDuelError(error: unknown): DuelErrorCode {
  const failure = error as Partial<ApiError> | null;
  if (failure?.code && failure.code in BY_CODE) return BY_CODE[failure.code]!;
  if (failure?.status === 429) return 'rate_limited';
  if (failure?.status === undefined) return 'network';
  return failure.status === 404 ? 'not_found' : 'unavailable';
}

/** A failure that may well be the same request arriving late: the same key must be sent again. */
const isTransient = (error: unknown) => {
  const status = (error as Partial<ApiError> | null)?.status;
  return status === undefined || status >= 500 || status === 429;
};

// ---- idempotent actions ----

const randomKey = () => globalThis.crypto.randomUUID();

/**
 * One `Idempotency-Key` per action: the same one while the action is retried after a lost response,
 * and a new one once it has been answered (or when the action is different).
 */
export function createKeyring(newKey: () => string = randomKey) {
  const keys = new Map<string, string>();
  return {
    keyFor(print: string) {
      let key = keys.get(print);
      if (!key) keys.set(print, (key = newKey()));
      return key;
    },
    release(print: string) {
      keys.delete(print);
    },
  };
}

export function createDuelActions(api: Pick<Api, 'request'>, roomId: string, newKey?: () => string) {
  const base = `/groups/rooms/${roomId}/duels`;
  const keyring = createKeyring(newKey);
  async function send<T>(print: string, method: string, path: string, json?: unknown): Promise<T> {
    try {
      const result = await api.request<T>(method, path, {...(json === undefined ? {} : {json}), headers: {'Idempotency-Key': keyring.keyFor(print)}});
      keyring.release(print);
      return result;
    } catch (error) {
      if (!isTransient(error)) keyring.release(print);
      throw error;
    }
  }
  return {
    create: (blueprintId: string, opponent?: string) =>
      send<DuelView>(JSON.stringify(['create', blueprintId, opponent ?? null]), 'POST', base, {
        blueprint_id: blueprintId,
        ...(opponent ? {opponent_pseudo: opponent} : {}),
      }),
    join: (code: string) => send<DuelView>(JSON.stringify(['join', code]), 'POST', `${base}/join`, {code}),
    accept: (duelId: string) => send<DuelView>(JSON.stringify(['accept', duelId]), 'POST', `${base}/${duelId}/accept`),
    ready: (duelId: string, ready: boolean) =>
      send<DuelView>(JSON.stringify(['ready', duelId, ready]), 'PUT', `${base}/${duelId}/ready`, {ready}),
    withdraw: (duelId: string) => send<DuelView>(JSON.stringify(['withdraw', duelId]), 'POST', `${base}/${duelId}/withdraw`),
  };
}

// ---- the draft ----

export type DraftError = 'stale' | 'closed' | 'invalid' | 'pro_required' | 'network' | 'unavailable';

export interface DraftState {
  loaded: boolean;
  /** The last answers the server confirmed. */
  confirmed: Record<string, DuelAnswer>;
  /** Edits not confirmed yet; `null` is a cleared answer. */
  unsaved: Record<string, DuelAnswer | null>;
  revision: number;
  saving: boolean;
  submitting: boolean;
  submittedAt: string | null;
  error: DraftError | null;
}

const MAX_RELOADS = 3;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const draftError = (error: unknown): DraftError => {
  switch (describeDuelError(error)) {
    case 'pro_required': return 'pro_required';
    case 'closed':
    case 'not_running':
    case 'locked':
    case 'not_found':
    case 'invite_closed':
      return 'closed';
    case 'invalid_answer': return 'invalid';
    case 'stale': return 'stale';
    case 'network': return 'network';
    default: return 'unavailable';
  }
};

/**
 * The learner's answers during a duel. Saves are serialised (one request at a time, each with the revision the last
 * one returned) and coalesced (only the latest edit of a question is sent). A save keeps its `Idempotency-Key` while it
 * is retried unchanged; a stale revision reloads the draft first, so nothing is sent against a revision the server
 * has moved past.
 */
export function createDuelDraft(api: Pick<Api, 'request'>, roomId: string, duelId: string, newKey: () => string = randomKey) {
  const base = `/groups/rooms/${roomId}/duels/${duelId}`;
  const listeners = new Set<() => void>();
  let state: DraftState = {loaded: false, confirmed: {}, unsaved: {}, revision: 0, saving: false, submitting: false, submittedAt: null, error: null};
  let running: Promise<void> | null = null;
  let inflight: {print: string; key: string} | null = null;
  let submitKey: {revision: number; key: string} | null = null;
  let stopped = false;

  const publish = (patch: Partial<DraftState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };

  async function load(): Promise<boolean> {
    try {
      const attempt = await api.request<Attempt>('GET', `${base}/attempt`);
      if (stopped) return false;
      const unsaved = Object.fromEntries(
        Object.entries(state.unsaved).filter(([id, answer]) => !same(answer ?? undefined, attempt.answers[id])),
      );
      publish({
        loaded: true, confirmed: attempt.answers, unsaved: attempt.submitted_at ? {} : unsaved,
        revision: attempt.revision, submittedAt: attempt.submitted_at,
        error: Object.keys(unsaved).length > 0 ? state.error : null,
      });
      return true;
    } catch (error) {
      if (!stopped) publish({error: draftError(error)});
      return false;
    }
  }

  async function drain() {
    let reloads = 0;
    while (!stopped) {
      const [id] = Object.keys(state.unsaved);
      if (id === undefined) break;
      const answer = state.unsaved[id] ?? null;
      const print = JSON.stringify([id, answer, state.revision]);
      if (inflight?.print !== print) inflight = {print, key: newKey()};
      publish({saving: true, error: null});
      try {
        const receipt = await api.request<{revision: number}>('PUT', `${base}/attempt/answers/${encodeURIComponent(id)}`, {
          json: {expected_revision: state.revision, answer},
          headers: {'Idempotency-Key': inflight.key},
        });
        inflight = null;
        const confirmed = {...state.confirmed};
        if (answer) confirmed[id] = answer;
        else delete confirmed[id];
        const unsaved = {...state.unsaved};
        if (same(unsaved[id] ?? null, answer)) delete unsaved[id];
        publish({confirmed, unsaved, revision: receipt.revision});
      } catch (error) {
        const code = describeDuelError(error);
        if (!isTransient(error)) inflight = null;
        if ((code === 'stale' || code === 'key_reused') && reloads++ < MAX_RELOADS) {
          if (await load()) continue;
          break;
        }
        if (code === 'invalid_answer') {
          const unsaved = {...state.unsaved};
          delete unsaved[id];
          publish({unsaved});
        }
        publish({error: draftError(error)});
        break;
      }
    }
    publish({saving: false});
  }

  const flush = () => (running ??= drain().finally(() => void (running = null)));

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    /** Reads the draft again once the saves in flight are done (a reconnect): never against a save half-way. */
    async reload() {
      await running;
      return load();
    },
    /** Records an edit; `null` clears the answer. */
    set(questionId: string, answer: DuelAnswer | null) {
      if (state.submittedAt || state.submitting) return;
      if (same(state.confirmed[questionId] ?? null, answer) && !(questionId in state.unsaved)) return;
      publish({unsaved: {...state.unsaved, [questionId]: answer}});
      void flush();
    },
    /** Sends the unsaved edits again (after a network failure, or a failed save the learner chose to retry). */
    retry: () => void flush(),
    /** Waits for every pending save, then hands in the draft. Null when something could not be saved or the revision moved. */
    async submit(): Promise<SubmitReceipt | null> {
      if (state.submitting || state.submittedAt) return null;
      publish({submitting: true});
      await flush();
      if (stopped || Object.keys(state.unsaved).length > 0) {
        publish({submitting: false});
        return null;
      }
      if (submitKey?.revision !== state.revision) submitKey = {revision: state.revision, key: newKey()};
      try {
        const receipt = await api.request<SubmitReceipt>('POST', `${base}/attempt/submit`, {
          json: {expected_revision: state.revision},
          headers: {'Idempotency-Key': submitKey.key},
        });
        submitKey = null;
        publish({submitting: false, submittedAt: receipt.submitted_at, error: null});
        return receipt;
      } catch (error) {
        if (!isTransient(error)) submitKey = null;
        const code = draftError(error);
        if (code === 'stale') await load();
        publish({submitting: false, error: code});
        return null;
      }
    },
    stop() {
      stopped = true;
    },
  };
}

export type DuelDraft = ReturnType<typeof createDuelDraft>;
