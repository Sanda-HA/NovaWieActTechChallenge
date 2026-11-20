import {readField} from './api';
import type {Api, ApiError, ChatResult} from './types';

export const subjects = {
  math: {label:'Mathématiques', prompt:'Explique les dérivées avec un exemple simple.'},
  svt: {label:'SVT', prompt:'Explique la photosynthèse étape par étape.'},
  physics: {label:'Physique', prompt:'Aide-moi à comprendre les lois de Newton.'},
  chemistry: {label:'Chimie', prompt:'Comment équilibrer une équation chimique ?'},
  french: {label:'Français', prompt:'Aide-moi à réviser la conjugaison française.'},
  english: {label:'Anglais', prompt:'Propose des exercices de grammaire anglaise.'},
  history: {label:'Histoire', prompt:'Résume les grandes étapes de la Révolution française.'},
  geography: {label:'Géographie', prompt:'Explique les zones climatiques avec des exemples.'},
  philosophy: {label:'Philosophie', prompt:'Aide-moi à comprendre la notion de liberté.'},
  computer_science: {label:'Informatique', prompt:'Explique les boucles avec un exemple de code.'},
} satisfies Record<string, {label:string; prompt:string}>;

const failures: Record<string, string> = {
  agent_unavailable: 'Nova est hors ligne pour le moment. Réessaie dans quelques minutes.',
  agent_error: 'Nova a renvoyé une réponse invalide. Tu peux réessayer.',
  internal_error: 'Nova a rencontré une erreur interne. Tu peux réessayer.',
  request_cancelled: 'La réponse a été interrompue. Tu peux réessayer.',
  stream_closed: 'La connexion a été coupée avant la fin de la réponse. Tu peux réessayer.',
  backend_unavailable: 'Le serveur de Nova est injoignable. Vérifie ta connexion puis réessaie.',
};

/** `sessionId` starts the thread on a tutor session the server already created (mistake practice). */
export interface ThreadOptions {subject?:string; mode?:string; sessionId?:string|null}

export interface Turn {
  message:string; action:string; mode:'guided'|'explain'; status:'pending'|'complete'|'failed';
  stage?:string; result?:ChatResult; error?:string|null;
}

export interface Thread {
  id:number; subject:string; mode:string; attempt:boolean; sessionId:string|null; turns:Turn[];
}

export interface TutorState {
  threads:Thread[]; activeId:number; recentId:number|null;
}

interface TutorSession {
  id:string;
}

export function failureMessage(error:{code?:string; retryAfter?:number|null}):string {
  const retryAfter = error.retryAfter ?? 0;
  if (retryAfter > 0) return 'Le tuteur est occupé. Réessaie dans ' + Math.ceil(retryAfter) + ' s.';
  return failures[error.code ?? ''] ?? 'Réponse indisponible. Tu peux réessayer.';
}

export function createTutorWorkspace(api:Pick<Api, 'request' | 'stream'>) {
  let serial = 0;
  let visit = new AbortController();
  const listeners = new Set<() => void>();
  const makeThread = ({subject = '', mode = 'free', sessionId = null}:ThreadOptions = {}):Thread =>
    ({id:++serial, subject, mode, attempt:false, sessionId, turns:[]});
  const initial = ():TutorState => {
    const thread = makeThread();
    return {threads:[thread], activeId:thread.id, recentId:null};
  };
  let state = initial();
  const publish = (next:TutorState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const find = (id:number) => state.threads.find(thread => thread.id === id);
  const update = (id:number, patch:Partial<Thread>) => {
    if (find(id)) publish({...state, threads:state.threads.map(thread => thread.id === id ? {...thread, ...patch} : thread)});
  };
  const updateLast = (id:number, change:Partial<Turn>, patch:Partial<Thread> = {}) => {
    const thread = find(id);
    if (thread) update(id, {...patch, turns:[...thread.turns.slice(0, -1), {...(thread.turns.at(-1) as Turn), ...change}]});
  };
  async function requestTurn(id:number, turn:Turn) {
    const signal = visit.signal;
    const thread = find(id) as Thread;
    try {
      let sessionId = thread.sessionId;
      if (!sessionId) {
        const session = await api.request<TutorSession | null>('POST', '/tutor/sessions', {
          signal, json:thread.subject ? {subject:thread.subject} : undefined,
        });
        if (signal.aborted) return;
        if (!session?.id) throw new Error('Missing tutor session ID');
        sessionId = session.id;
        update(id, {sessionId});
      }
      const result = await api.stream<ChatResult>('/tutor/sessions/' + sessionId + '/messages/stream', {
        signal, json:{message:turn.message, mode:turn.mode, action:turn.action},
        onEvent:(kind, body) => { if (kind === 'stage' && !signal.aborted) updateLast(id, {stage:readField(body, 'stage') as string}); },
      });
      if (signal.aborted) return;
      if (result.badge == null && result.retry_after != null) {
        updateLast(id, {status:'failed', error:result.answer});
      } else {
        updateLast(id, {status:'complete', result, error:null}, {attempt:result.attempt_result?.verdict === 'unknown'});
      }
    } catch (error) {
      if (!signal.aborted) updateLast(id, {status:'failed', error:failureMessage(error as ApiError)});
    }
  }

  return {
    getSnapshot:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // activeId always names an existing thread: initial() creates one and clear() resets to it.
    active:() => find(state.activeId) as Thread,
    newThread(options?:ThreadOptions) {
      const thread = makeThread(options);
      publish({...state, threads:[thread, ...state.threads], activeId:thread.id});
      return thread.id;
    },
    select(id:number) {
      const thread = find(id);
      if (thread) publish({...state, activeId:id, recentId:thread.turns.length ? id : state.recentId});
    },
    setSubject(id:number, subject:string) {
      if (find(id)?.turns.length === 0 && (!subject || Object.hasOwn(subjects, subject))) update(id, {subject});
    },
    setMode(id:number, mode:string) {
      if (find(id)?.turns.at(-1)?.status !== 'pending') update(id, {mode, attempt:false});
    },
    setAttempt(id:number) { update(id, {attempt:true}); },
    send(id:number, message:string, action = 'auto'):Promise<void> | undefined {
      const thread = find(id);
      const cleaned = message.trim();
      if (!thread || !cleaned || cleaned.length > 2000 || thread.turns.at(-1)?.status === 'pending') return;
      const turn:Turn = {message:cleaned, action, mode:thread.mode === 'guided' ? 'guided' : 'explain', status:'pending'};
      publish({...state, recentId:id, threads:state.threads.map(item =>
        item.id === id ? {...thread, turns:[...thread.turns, turn]} : item)});
      return requestTurn(id, turn);
    },
    retry(id:number):Promise<void> | undefined {
      const turn = find(id)?.turns.at(-1);
      if (turn?.status !== 'failed') return;
      updateLast(id, {status:'pending', error:null});
      return requestTurn(id, turn);
    },
    clear() {
      visit.abort();
      visit = new AbortController();
      publish(initial());
    },
  };
}

export type AnswerBlock =
  | {kind:'paragraph'|'heading'|'code'; text:string}
  | {kind:'list'; ordered:boolean; items:string[]};

// The renderer treats every block as text; model output never becomes HTML.
export function answerBlocks(answer:string):AnswerBlock[] {
  // [[chunk_id]] markers let the agent verify citations; the sources list under the answer shows them to the learner.
  const lines = answer.replace(/\r\n?/g, '\n').replace(/[ \t]*\[\[[^\]\n]+\]\]/g, '').split('\n');
  const blocks:AnswerBlock[] = [];
  const listItem = /^ {0,3}(?:([-*+])|(\d+)[.)])\s+(.+)$/;
  const heading = /^ {0,3}#{1,6}\s+(.+)$/;
  const fence = /^ {0,3}(\x60{3,}|~{3,})/;
  for (let i = 0; i < lines.length;) {
    const line = lines[i++] ?? '';
    if (!line.trim()) continue;
    const code = line.match(fence)?.[1];
    const item = line.match(listItem);
    const title = line.match(heading);
    if (code) {
      const content:string[] = [];
      const close = new RegExp('^ {0,3}' + code.charAt(0) + '{' + code.length + ',}\\s*$');
      while (i < lines.length && !close.test(lines[i] ?? '')) content.push(lines[i++] ?? '');
      i++;
      blocks.push({kind:'code', text:content.join('\n')});
    } else if (line.trimStart().startsWith('$$')) {
      const content = [line];
      if (line.trimStart().indexOf('$$', 2) === -1) {
        while (i < lines.length) {
          const part = lines[i++] ?? '';
          content.push(part);
          if (part.includes('$$')) break;
        }
      }
      blocks.push({kind:'paragraph', text:content.join('\n')});
    } else if (item) {
      const ordered = Boolean(item[2]);
      const items = [item[3] ?? ''];
      for (let next:RegExpMatchArray|null; i < lines.length && (next = (lines[i] ?? '').match(listItem)) && Boolean(next[2]) === ordered; i++) {
        items.push(next[3] ?? '');
      }
      blocks.push({kind:'list', ordered, items});
    } else if (title) {
      blocks.push({kind:'heading', text:title[1] ?? ''});
    } else {
      const content = [line];
      while (i < lines.length && (lines[i] ?? '').trim() && !(lines[i] ?? '').trimStart().startsWith('$$')
        && ![listItem, heading, fence].some(pattern => pattern.test(lines[i] ?? ''))) content.push(lines[i++] ?? '');
      blocks.push({kind:'paragraph', text:content.join('\n')});
    }
  }
  return blocks;
}

export interface InlineToken {
  kind:'math'|'code'|'strong'; text:string;
}

export function answerInline(text:string):InlineToken[] {
  const tokens:InlineToken[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$])+\$)|(\x60[^\x60\n]+\x60)|(\*\*[^*\n]+\*\*)/g;
  let offset = 0;
  for (const token of text.matchAll(pattern)) {
    const [match, formula, code, strong] = token;
    const start = token.index;
    if (start > offset) tokens.push({kind:'math', text:text.slice(offset, start)});
    tokens.push(formula ? {kind:'math', text:formula} : code
      ? {kind:'code', text:code.slice(1, -1)} : {kind:'strong', text:(strong ?? '').slice(2, -2)});
    offset = start + match.length;
  }
  if (offset < text.length) tokens.push({kind:'math', text:text.slice(offset)});
  return tokens;
}
