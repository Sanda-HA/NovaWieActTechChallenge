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
};

export function createTutorWorkspace(api) {
  let serial = 0;
  let visit = new AbortController();
  const listeners = new Set();
  const makeThread = ({subject = '', mode = 'free'} = {}) =>
    ({id:++serial, subject, mode, attempt:false, sessionId:null, turns:[]});
  const initial = () => {
    const thread = makeThread();
    return {threads:[thread], activeId:thread.id, recentId:null};
  };
  let state = initial();
  const publish = next => {
    state = next;
    for (const listener of listeners) listener();
  };
  const find = id => state.threads.find(thread => thread.id === id);
  const update = (id, patch) => {
    if (find(id)) publish({...state, threads:state.threads.map(thread => thread.id === id ? {...thread,...patch} : thread)});
  };
  const updateLast = (id, change, patch = {}) => {
    const thread = find(id);
    if (thread) update(id, {...patch, turns:[...thread.turns.slice(0,-1), {...thread.turns.at(-1),...change}]});
  };
  async function requestTurn(id, turn) {
    const signal = visit.signal;
    const thread = find(id);
    try {
      let sessionId = thread.sessionId;
      if (!sessionId) {
        const session = await api.request('POST','/tutor/sessions',{
          signal, json:thread.subject ? {subject:thread.subject} : undefined,
        });
        if (signal.aborted) return;
        if (!session?.id) throw new Error('Missing tutor session ID');
        sessionId = session.id;
        update(id,{sessionId});
      }
      const result = await api.request('POST','/tutor/sessions/' + sessionId + '/messages',{
        signal, json:{message:turn.message, mode:turn.mode, action:turn.action},
      });
      if (signal.aborted) return;
      if (result.badge == null && result.retry_after != null) {
        updateLast(id,{status:'failed',error:result.answer});
      } else {
        updateLast(id,{status:'complete',result,error:null},{attempt:result.attempt_result?.verdict === 'unknown'});
      }
    } catch (error) {
      if (!signal.aborted) updateLast(id,{status:'failed',error:error.retryAfter > 0
        ? 'Le tuteur est occupé. Réessaie dans ' + Math.ceil(error.retryAfter) + ' s.'
        : 'Réponse indisponible. Tu peux réessayer.'});
    }
  }

  return {
    getSnapshot:() => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    active:() => find(state.activeId),
    newThread(options) {
      const thread = makeThread(options);
      publish({...state, threads:[thread,...state.threads], activeId:thread.id});
      return thread.id;
    },
    select(id) {
      const thread = find(id);
      if (thread) publish({...state,activeId:id,recentId:thread.turns.length ? id : state.recentId});
    },
    setSubject(id, subject) {
      if (find(id)?.turns.length === 0 && (!subject || Object.hasOwn(subjects,subject))) update(id,{subject});
    },
    setMode(id, mode) {
      if (find(id)?.turns.at(-1)?.status !== 'pending') update(id,{mode,attempt:false});
    },
    setAttempt(id) { update(id,{attempt:true}); },
    send(id, message, action = 'auto') {
      const thread = find(id);
      const cleaned = message.trim();
      if (!thread || !cleaned || cleaned.length > 2000 || thread.turns.at(-1)?.status === 'pending') return;
      const turn = {message:cleaned, action, mode:thread.mode === 'guided' ? 'guided' : 'explain',status:'pending'};
      publish({...state, recentId:id, threads:state.threads.map(item =>
        item.id === id ? {...thread,turns:[...thread.turns,turn]} : item)});
      return requestTurn(id,turn);
    },
    retry(id) {
      const turn = find(id)?.turns.at(-1);
      if (turn?.status !== 'failed') return;
      updateLast(id,{status:'pending',error:null});
      return requestTurn(id,turn);
    },
    clear() {
      visit.abort();
      visit = new AbortController();
      publish(initial());
    },
  };
}

// The renderer treats every block as text; model output never becomes HTML.
export function answerBlocks(answer) {
  const lines = answer.replace(/\r\n?/g,'\n').split('\n');
  const blocks = [];
  const listItem = /^ {0,3}(?:([-*+])|(\d+)[.)])\s+(.+)$/;
  const heading = /^ {0,3}#{1,6}\s+(.+)$/;
  const fence = /^ {0,3}(\x60{3,}|~{3,})/;
  for (let i = 0; i < lines.length;) {
    const line = lines[i++];
    if (!line.trim()) continue;
    const code = line.match(fence)?.[1];
    const item = line.match(listItem);
    const title = line.match(heading);
    if (code) {
      const content = [];
      const close = new RegExp('^ {0,3}' + code[0] + '{' + code.length + ',}\\s*$');
      while (i < lines.length && !close.test(lines[i])) content.push(lines[i++]);
      i++;
      blocks.push({kind:'code',text:content.join('\n')});
    } else if (line.trimStart().startsWith('$$')) {
      const content = [line];
      if (line.trimStart().indexOf('$$',2) === -1) {
        while (i < lines.length) {
          const part = lines[i++];
          content.push(part);
          if (part.includes('$$')) break;
        }
      }
      blocks.push({kind:'paragraph',text:content.join('\n')});
    } else if (item) {
      const ordered = Boolean(item[2]);
      const items = [item[3]];
      for (let next; i < lines.length && (next = lines[i].match(listItem)) && Boolean(next[2]) === ordered; i++) {
        items.push(next[3]);
      }
      blocks.push({kind:'list',ordered,items});
    } else if (title) {
      blocks.push({kind:'heading',text:title[1]});
    } else {
      const content = [line];
      while (i < lines.length && lines[i].trim() && !lines[i].trimStart().startsWith('$$')
        && ![listItem,heading,fence].some(pattern => pattern.test(lines[i]))) content.push(lines[i++]);
      blocks.push({kind:'paragraph',text:content.join('\n')});
    }
  }
  return blocks;
}

export function answerInline(text) {
  const tokens = [];
  const pattern = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$])+\$)|(\x60[^\x60\n]+\x60)|(\*\*[^*\n]+\*\*)/g;
  let offset = 0;
  for (const token of text.matchAll(pattern)) {
    const [match, formula, code, strong] = token;
    const start = token.index;
    if (start > offset) tokens.push({kind:'math',text:text.slice(offset,start)});
    tokens.push(formula ? {kind:'math',text:formula} : code
      ? {kind:'code',text:code.slice(1,-1)} : {kind:'strong',text:strong.slice(2,-2)});
    offset = start + match.length;
  }
  if (offset < text.length) tokens.push({kind:'math',text:text.slice(offset)});
  return tokens;
}
