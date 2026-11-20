import {afterEach, describe, expect, it} from 'vitest';
import {getLocale, setLocale} from '../lib/i18n-store';
import {createSession} from './session';
import {memoryStorage, signedInBackend, stubFetch} from './testing';

afterEach(() => setLocale('fr'));

describe('createSession', () => {
  it('starts signed out without a token and makes no request', async () => {
    const {calls, fetchImpl} = stubFetch(signedInBackend());
    const session = createSession({fetchImpl, storage: memoryStorage()});
    expect(session.getSnapshot().status).toBe('signedOut');
    await session.start();
    expect(calls).toStrictEqual([]);
    expect(session.getSnapshot().status).toBe('signedOut');
  });

  it('restores a stored token once, even when started twice', async () => {
    const {calls, fetchImpl} = stubFetch(signedInBackend('eleve01', 'en'));
    const session = createSession({fetchImpl, storage: memoryStorage('t1')});
    expect(session.getSnapshot().status).toBe('restoring');
    await Promise.all([session.start(), session.start()]);
    expect(session.getSnapshot()).toMatchObject({status: 'signedIn', pseudo: 'eleve01', onboarding: false});
    expect(calls.filter(call => call === 'GET /auth/me')).toHaveLength(1);
    expect(getLocale()).toBe('en');
  });

  it('keeps the token and reports the backend as unavailable, then retries', async () => {
    let down = true;
    const storage = memoryStorage('t1');
    const {fetchImpl} = stubFetch((method, path) =>
      down ? Response.json({detail: {error: 'backend_unavailable'}}, {status: 503}) : signedInBackend()(method, path),
    );
    const session = createSession({fetchImpl, storage});
    await session.start();
    expect(session.getSnapshot().status).toBe('unavailable');
    expect(storage.items.get('ednova-token')).toBe('t1');
    down = false;
    await session.restore();
    expect(session.getSnapshot()).toMatchObject({status: 'signedIn', pseudo: 'eleve01'});
  });

  it('signs out on an expired token during restore', async () => {
    const storage = memoryStorage('stale');
    const {fetchImpl} = stubFetch(() => Response.json({detail: {error: 'unauthorized'}}, {status: 401}));
    const session = createSession({fetchImpl, storage});
    await session.start();
    expect(session.getSnapshot().status).toBe('signedOut');
    expect(storage.items.has('ednova-token')).toBe(false);
  });

  it('signs out when any later call returns 401', async () => {
    let expired = false;
    const storage = memoryStorage('t1');
    const {fetchImpl} = stubFetch((method, path) =>
      expired ? Response.json({}, {status: 401}) : signedInBackend()(method, path),
    );
    const session = createSession({fetchImpl, storage});
    await session.start();
    expect(session.getSnapshot().status).toBe('signedIn');
    expired = true;
    await expect(session.api.request('GET', '/me/profile')).rejects.toMatchObject({status: 401});
    expect(session.getSnapshot()).toMatchObject({status: 'signedOut', pseudo: null});
    expect(storage.items.has('ednova-token')).toBe(false);
  });

  it('marks a sign-in from the account form, with onboarding until it ends', () => {
    const {fetchImpl} = stubFetch(signedInBackend());
    const session = createSession({fetchImpl, storage: memoryStorage()});
    session.signedIn('eleve01', {onboarding: true});
    expect(session.getSnapshot()).toMatchObject({status: 'signedIn', pseudo: 'eleve01', onboarding: true});
    session.finishOnboarding();
    expect(session.getSnapshot().onboarding).toBe(false);
  });

  it('signOut clears the token, the tutor and the timer', async () => {
    const storage = memoryStorage('t1');
    const {fetchImpl} = stubFetch(signedInBackend());
    const session = createSession({fetchImpl, storage});
    await session.start();
    session.signOut();
    expect(session.getSnapshot()).toMatchObject({status: 'signedOut', pseudo: null, onboarding: false});
    expect(session.api.hasToken()).toBe(false);
    expect(storage.items.has('ednova-token')).toBe(false);
    expect(session.tutor.getSnapshot().threads).toHaveLength(1);
    expect(session.timer.getSnapshot().phase).toBe('idle');
  });
});
