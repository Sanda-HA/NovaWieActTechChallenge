import type {Api, ApiError, KeyValueStorage, StudySummary} from './types';

export const presets = [25, 45] as const;
export const breakMs = 5 * 60000;
const storageKey = 'ednova-study-timer';
const minute = 60000;

type Phase = 'idle' | 'running' | 'paused' | 'done' | 'break';

export interface TimerCore {
  phase:Phase; durationMs:number; remainingMs:number; endsAt:number|null;
}

export interface TimerState extends TimerCore {
  busy:boolean; error:string|null; summary:StudySummary|null; announcement:string;
}

interface SavedTimer extends TimerCore {
  owner:string;
}

const phases: unknown[] = ['idle', 'paused', 'running', 'done', 'break'];
const fresh = (durationMs:number): TimerCore => ({phase:'idle', durationMs, remainingMs:durationMs, endsAt:null});

function isSaved(value:unknown, pseudo:string):value is SavedTimer {
  const saved = value as Partial<SavedTimer> | null;
  return saved?.owner === pseudo && phases.includes(saved.phase)
    && Number.isFinite(saved.durationMs) && Number.isFinite(saved.remainingMs);
}

interface TimerOptions {
  now?:() => number; storage?:KeyValueStorage;
}

// The countdown lives here so it survives screen changes. Running time is recorded on the server as
// study sessions: start opens one with a planned end, pause closes it, resume opens the next one.
// The short break after a finished block only lives here: it never touches the server, so it is not study time.
export function createStudyTimer(api:Pick<Api, 'request'>, {now = () => Date.now(), storage = globalThis.sessionStorage}:TimerOptions = {}) {
  const listeners = new Set<() => void>();
  let owner:string|null = null;
  let state:TimerState = {...fresh(presets[0] * minute), busy:false, error:null, summary:null, announcement:''};

  const publish = (patch:Partial<TimerState>) => {
    state = {...state, ...patch};
    if (owner) {
      const {phase, durationMs, remainingMs, endsAt} = state;
      try { storage?.setItem(storageKey, JSON.stringify({owner, phase, durationMs, remainingMs, endsAt})); } catch {}
    }
    for (const listener of listeners) listener();
  };

  const remaining = () => state.phase === 'running' || state.phase === 'break' ? Math.max(0, state.endsAt! - now()) : state.remainingMs;
  const stopServer = () => api.request('POST', '/study/stop').catch((error:unknown) => {
    if ((error as ApiError).status !== 409) throw error;
  });

  async function act(work:() => Promise<void>, failure:string) {
    if (state.busy) return;
    publish({busy:true, error:null});
    try {
      await work();
      publish({busy:false});
    } catch (error) {
      if ((error as ApiError).name === 'AbortError') return;
      publish({busy:false, error:failure});
    }
  }

  async function refreshSummary() {
    const summary = await api.request<StudySummary>('GET', '/study/summary');
    publish({summary});
    return summary;
  }

  async function sync() {
    const summary = await refreshSummary();
    const planned = summary.planned_end ? Date.parse(summary.planned_end) : null;
    if (summary.in_progress && planned) {
      if (state.phase !== 'running' || state.endsAt !== planned) {
        const durationMs = Math.max(state.durationMs, planned - now());
        publish({phase:'running', endsAt:planned, durationMs, remainingMs:planned - now()});
      }
    } else if (summary.in_progress) {
      // A session without a planned end comes from the former stopwatch; close it so time stops counting.
      await stopServer();
      await refreshSummary();
    } else if (state.phase === 'running') {
      const left = Math.max(0, state.endsAt! - now());
      publish(left > 0 ? {phase:'paused', remainingMs:left, endsAt:null} : {...fresh(state.durationMs), phase:'done'});
    }
  }

  return {
    getSnapshot:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    remaining,
    // Restores this learner's paused countdown after a refresh, then reconciles with the server.
    attach(pseudo:string) {
      owner = pseudo;
      let saved:unknown = null;
      try { saved = JSON.parse(storage?.getItem(storageKey) ?? 'null'); } catch {}
      if (isSaved(saved, pseudo)) {
        const {phase, durationMs, remainingMs, endsAt} = saved;
        publish({phase, durationMs, remainingMs, endsAt});
      }
      return act(sync, 'Le minuteur n’a pas pu se synchroniser.');
    },
    refresh:() => act(sync, 'Le minuteur n’a pas pu se synchroniser.'),
    setDuration(minutes:number) {
      if (state.busy || state.phase === 'running' || state.phase === 'paused' || state.phase === 'break') return;
      const value = Math.round(Number(minutes));
      if (!Number.isFinite(value) || value < 1 || value > 240) return;
      publish({...fresh(value * minute), announcement:''});
    },
    start:() => act(async () => {
      if (state.phase === 'running') return;
      const left = state.phase === 'paused' ? state.remainingMs : state.durationMs;
      await api.request('POST', '/study/start', {json:{minutes:left / minute}});
      publish({phase:'running', endsAt:now() + left, remainingMs:left, announcement:'Séance en cours.'});
      await refreshSummary();
    }, 'La séance n’a pas pu démarrer.'),
    pause:() => act(async () => {
      if (state.phase !== 'running') return;
      const left = remaining();
      await stopServer();
      publish({phase:'paused', remainingMs:left, endsAt:null, announcement:'Séance en pause.'});
      await refreshSummary();
    }, 'La pause n’a pas pu être enregistrée.'),
    reset:() => act(async () => {
      if (state.phase === 'running') await stopServer();
      publish({...fresh(state.durationMs), announcement:'Minuteur réinitialisé.'});
      await refreshSummary();
    }, 'Le minuteur n’a pas pu être réinitialisé.'),
    startBreak() {
      if (state.busy || state.phase !== 'done') return;
      publish({phase:'break', remainingMs:breakMs, endsAt:now() + breakMs, announcement:'Pause de 5 minutes.'});
    },
    skipBreak() {
      if (state.busy || (state.phase !== 'break' && state.phase !== 'done')) return;
      publish({...fresh(state.durationMs), announcement:'Pause passée.'});
    },
    // The server closes the session at its planned end on its own; this only updates the view.
    complete:() => act(async () => {
      if (state.phase === 'break' && remaining() <= 0) {
        publish({...fresh(state.durationMs), announcement:'Pause terminée. Prêt pour la suite ?'});
        return;
      }
      if (state.phase !== 'running' || remaining() > 0) return;
      publish({...fresh(state.durationMs), phase:'done', announcement:'Séance terminée. Bravo !'});
      await refreshSummary();
    }, 'Le minuteur n’a pas pu se synchroniser.'),
    clear() {
      owner = null;
      try { storage?.removeItem(storageKey); } catch {}
      state = {...fresh(presets[0] * minute), busy:false, error:null, summary:null, announcement:''};
      for (const listener of listeners) listener();
    },
  };
}
