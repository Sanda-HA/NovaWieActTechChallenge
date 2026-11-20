import {createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode} from 'react';
import {createApi} from '../lib/api';
import {setLocale} from '../lib/i18n-store';
import {restoreSession} from '../lib/session-restore';
import {createStudyTimer} from '../lib/study-timer';
import {createTutorWorkspace} from '../lib/tutor-workspace';
import type {KeyValueStorage} from '../lib/types';

export interface ExternalStore<S> {
  subscribe(listener: () => void): () => unknown;
  getSnapshot(): S;
}

export function useStore<S>(store: ExternalStore<S>): S {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** `unavailable`: a token is stored but the backend could not confirm it (not a 401). */
export type SessionStatus = 'restoring' | 'unavailable' | 'signedOut' | 'signedIn';

export interface SessionSnapshot {
  status: SessionStatus;
  pseudo: string | null;
  /** Signed in from the account form and still on the onboarding steps. */
  onboarding: boolean;
}

interface SessionOptions {
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  storage?: KeyValueStorage;
}

const signedOut: SessionSnapshot = {status: 'signedOut', pseudo: null, onboarding: false};

export function createSession({fetchImpl, storage = globalThis.sessionStorage}: SessionOptions = {}) {
  const listeners = new Set<() => void>();
  const proListeners = new Set<(feature?: string) => void>();
  const api = createApi({
    fetchImpl,
    storage,
    onExpired: () => signOut(),
    onProRequired: feature => proListeners.forEach(listener => listener(feature)),
  });
  const timer = createStudyTimer(api, {storage});
  const tutor = createTutorWorkspace(api);
  let snapshot: SessionSnapshot = api.hasToken() ? {...signedOut, status: 'restoring'} : signedOut;
  let started: Promise<void> | null = null;

  const publish = (next: SessionSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  // No reload: the guards send a signed-out learner to /compte.
  function signOut() {
    api.clear();
    tutor.clear();
    timer.clear();
    if (snapshot !== signedOut) publish(signedOut);
  }

  function signedIn(pseudo: string, {onboarding = false}: {onboarding?: boolean} = {}) {
    void timer.attach(pseudo);
    publish({status: 'signedIn', pseudo, onboarding});
  }

  async function restore() {
    if (!api.hasToken()) return signOut();
    publish({...signedOut, status: 'restoring'});
    const restored = await restoreSession(api);
    if (restored) {
      setLocale(restored.profile.reply_language);
      signedIn(restored.pseudo);
    } else if (api.hasToken()) {
      publish({...signedOut, status: 'unavailable'});
    }
  }

  return {
    api,
    timer,
    tutor,
    /** Called after any 403 pro_required, so the cached plan can be refreshed. */
    onProRequired(listener: (feature?: string) => void) {
      proListeners.add(listener);
      return () => proListeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Restores the stored token once per page load; StrictMode's second effect run reuses it. */
    start: () => (started ??= snapshot.status === 'restoring' ? restore() : Promise.resolve()),
    restore,
    signedIn,
    finishOnboarding() {
      if (snapshot.onboarding) publish({...snapshot, onboarding: false});
    },
    signOut,
  };
}

export type Session = ReturnType<typeof createSession>;

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({session, children}: {session: Session; children: ReactNode}): React.JSX.Element {
  useEffect(() => void session.start(), [session]);
  return createElement(SessionContext.Provider, {value: session}, children);
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession needs a SessionProvider');
  const {status, pseudo, onboarding} = useStore(session);
  const {api, timer, tutor, signOut, signedIn, finishOnboarding, restore} = session;
  return {status, pseudo, onboarding, api, timer, tutor, signOut, signedIn, finishOnboarding, restore};
}
