import type {Api, ApiError, KeyValueStorage, Room} from './types';

const roomsPath = '/groups/rooms';
const pendingKey = 'ednova-join-code';

export interface RoomsState {
  status:'loading'|'ready'|'error';
  rooms:Room[];
  selectedId:string;
  busy:boolean;
  error:string|null;
  joinError:string|null;
  notice:string|null;
}

export const codePattern = /^[A-HJ-NP-Z2-9]{6}$/;
export const normalizeCode = (value:string) => value.toUpperCase().replace(/[\s-]/g, '');
export const codeHint = '6 caractères : lettres A à Z sans I ni O, chiffres 2 à 9.';
export const inviteLink = (location:Pick<Location, 'origin' | 'pathname'>, code:string) =>
  location.origin + location.pathname + '#rejoindre=' + code;

const joinErrors = {
  format:'Ce code n’a pas le bon format. ' + codeHint,
  not_found:'Ce code n’existe pas ou la salle a été fermée. Demande un nouveau code à la personne qui t’a invité.',
  unavailable:'Impossible de rejoindre la salle pour le moment. Réessaie.',
  full:'Cette salle est complète (8 membres maximum).',
};

// An invite link opens the app signed out; the code waits in this tab until the learner signs in.
export function capturePendingCode(location:Pick<Location, 'hash' | 'pathname'>, history:Pick<History, 'replaceState'>,
  storage:KeyValueStorage|undefined = globalThis.sessionStorage) {
  const match = location.hash.match(/^#rejoindre=([A-Za-z0-9-]{6,8})$/u);
  if (!match) return;
  try { storage?.setItem(pendingKey, normalizeCode(match[1] ?? '')); } catch {}
  history.replaceState(null, '', location.pathname + '#bienvenue');
}

export function createRoomsStore(api:Pick<Api, 'request'>, {storage = globalThis.sessionStorage}:{storage?:KeyValueStorage} = {}) {
  const listeners = new Set<() => void>();
  let state:RoomsState = {status:'loading', rooms:[], selectedId:'', busy:false, error:null, joinError:null, notice:null};
  const publish = (patch:Partial<RoomsState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const upsert = (room:Room) => [...state.rooms.filter(item => item.id !== room.id), room]
    .sort((a, b) => a.name.localeCompare(b.name));

  async function act(work:() => Promise<void>, failure:(error:ApiError) => Partial<RoomsState>) {
    if (state.busy) return;
    publish({busy:true, error:null, joinError:null, notice:null});
    try {
      await work();
      publish({busy:false});
    } catch (error) {
      if ((error as ApiError).name === 'AbortError') return;
      publish({busy:false, ...failure(error as ApiError)});
    }
  }

  return {
    getSnapshot:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hasPendingCode() {
      try { return Boolean(storage?.getItem(pendingKey)); } catch { return false; }
    },
    takePendingCode() {
      try {
        const code = storage?.getItem(pendingKey) ?? '';
        storage?.removeItem(pendingKey);
        return code;
      } catch { return ''; }
    },
    async load() {
      try {
        const rooms = await api.request<Room[]>('GET', roomsPath);
        const selectedId = rooms.some(room => room.id === state.selectedId) ? state.selectedId : '';
        publish({status:'ready', rooms, selectedId});
      } catch (error) {
        if ((error as ApiError).name !== 'AbortError') publish({status:'error', error:'Impossible de charger tes salles.'});
      }
    },
    select:(id:string) => publish({selectedId:id, notice:null, error:null, joinError:null}),
    update:(room:Room) => publish({rooms:upsert(room)}),
    create:(name:string) => act(async () => {
      const room = await api.request<Room>('POST', roomsPath, {json:{name:name.trim()}});
      publish({rooms:upsert(room), selectedId:room.id, notice:'Salle créée. Partage le code ou le lien pour inviter tes amis.'});
    }, () => ({error:'Impossible de créer la salle. Réessaie.'})),
    join(raw:string) {
      const code = normalizeCode(raw);
      if (!codePattern.test(code)) {
        publish({joinError:joinErrors.format, notice:null});
        return Promise.resolve();
      }
      return act(async () => {
        const room = await api.request<Room>('POST', roomsPath + '/join', {json:{code}});
        publish({rooms:upsert(room), selectedId:room.id,
          notice:room.already_member ? 'Tu es déjà dans cette salle : la voici.' : 'Bienvenue dans la salle.'});
      }, error => ({joinError:error.status === 409 && error.code === 'room_full' ? joinErrors.full
        : error.status === 404 ? joinErrors.not_found
        : error.status === 422 ? joinErrors.format : joinErrors.unavailable}));
    },
    leave:(room:Room) => act(async () => {
      try {
        await api.request('DELETE', roomsPath + '/' + room.id);
      } catch (error) {
        if ((error as ApiError).status !== 404) throw error;
      }
      publish({rooms:state.rooms.filter(item => item.id !== room.id), selectedId:'',
        notice:room.owner ? 'Salle fermée.' : 'Tu as quitté la salle.'});
    }, () => ({error:'Impossible de quitter ou de fermer la salle. Réessaie.'})),
    gone(id:string) {
      publish({rooms:state.rooms.filter(item => item.id !== id), selectedId:state.selectedId === id ? '' : state.selectedId,
        notice:'Cette salle n’est plus disponible : elle a été fermée, ou tu en as été retiré.'});
    },
  };
}
