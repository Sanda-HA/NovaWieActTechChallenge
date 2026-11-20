import type {Api, Profile} from './types';

export interface RestoredSession {
  pseudo:string; profile:Profile;
}

// A 401 here reaches the API's onExpired handler, which signs out; the guards then send the learner to /compte.
export async function restoreSession(api:Api):Promise<RestoredSession | null> {
  if (!api.hasToken()) return null;
  try {
    const me = await api.request<{pseudo:string}>('GET', '/auth/me');
    const profile = await api.request<Profile>('GET', '/me/profile');
    return {pseudo: me.pseudo, profile};
  } catch {
    return null;
  }
}
