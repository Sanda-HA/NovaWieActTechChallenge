// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createTutorWorkspace, answerBlocks, answerInline, failureMessage} from './tutor-workspace';
import type {Api, StreamOptions} from './types';

const asApi = (fake: object) => fake as unknown as Pick<Api, 'request' | 'stream'>;
const streamChat = (stream: (path: string, options: StreamOptions) => Promise<unknown>) =>
  createTutorWorkspace(asApi({request: async () => ({id:'s'}), stream}));

describe('tutor workspace', () => {
  it('sends the practice prompt to the session already issued for a recorded mistake', async () => {
    const paths: string[] = [];
    const chat = createTutorWorkspace(asApi({
      async request(_method: string, path: string) { paths.push(path); return {id:'new-session'}; },
      async stream(path: string) { paths.push(path); return {answer:'Un indice', badge:'hint'}; },
    }));
    const id = chat.newThread({subject:'math', mode:'guided', sessionId:'practice-session'});
    await chat.send(id, 'Exercice sur la tangente', 'new_question');
    expect(paths).toStrictEqual(['/tutor/sessions/practice-session/messages/stream']);
  });

  it('a late reply updates its originating thread and subject', async () => {
    let finish: (value: unknown) => void = () => {};
    const calls: {method: string; path: string; json: unknown}[] = [];
    const chat = createTutorWorkspace(asApi({
      request(method: string, path: string, {json}: {json?: unknown} = {}) {
        calls.push({method, path, json});
        return {id:'history-session'};
      },
      stream(path: string, {json}: StreamOptions) {
        calls.push({method:'POST', path, json});
        return new Promise(resolve => {finish = resolve;});
      },
    }));
    const history = chat.active().id;
    chat.setSubject(history, 'history');
    const sending = chat.send(history, 'Explique la Révolution française.');
    expect(chat.active().turns[0]?.status).toBe('pending');
    const physics = chat.newThread({subject:'physics', mode:'guided'});
    await Promise.resolve();
    finish({answer:'En 1789…'});
    await sending;
    expect(chat.active().id).toBe(physics);
    expect(chat.active().turns).toStrictEqual([]);
    chat.select(history);
    expect(chat.active().turns[0]?.result?.answer).toBe('En 1789…');
    expect(calls[0]?.json).toStrictEqual({subject:'history'});
    expect(calls[1]?.path).toBe('/tutor/sessions/history-session/messages/stream');
  });

  it('retry reuses the session and student message after a waiting response', async () => {
    const paths: string[] = [];
    const reply = async (path: string) => {
      paths.push(path);
      return paths.length === 2
        ? {answer:'Attends.', badge:null, retry_after:3}
        : {answer:'Un indice', badge:'hint', mode:'guided', hint_rung:0};
    };
    const chat = createTutorWorkspace(asApi({
      async request(_method: string, path: string) { paths.push(path); return {id:'s'}; },
      stream: reply,
    }));
    const id = chat.active().id;
    chat.setMode(id, 'guided');
    await chat.send(id, 'Un exercice.', 'new_question');
    expect(chat.active().turns[0]?.error).toBe('Attends.');
    await chat.retry(id);
    expect(chat.active().turns.length).toBe(1);
    expect(chat.active().turns[0]?.result?.hint_rung).toBe(0);
    expect(paths).toStrictEqual(['/tutor/sessions', '/tutor/sessions/s/messages/stream', '/tutor/sessions/s/messages/stream']);
  });

  it('clearing the visit discards pending responses and transcript titles', async () => {
    let finish: (value: unknown) => void = () => {};
    const chat = createTutorWorkspace(asApi({
      request: () => ({id:'old'}),
      stream: () => new Promise(resolve => {finish = resolve;}),
    }));
    const sending = chat.send(chat.active().id, 'Un texte privé.');
    await Promise.resolve();
    chat.clear();
    finish({answer:'Un ancien résultat.'});
    await sending;
    expect(chat.getSnapshot().threads.length).toBe(1);
    expect(chat.active().turns).toStrictEqual([]);
  });

  it('stream stage updates the pending turn', async () => {
    const chat = streamChat((_path, {onEvent}) => {
      onEvent?.('stage', {stage:'verifying'});
      return new Promise(() => {});
    });
    chat.send(chat.active().id, 'Une question.');
    await new Promise(resolve => setTimeout(resolve, 0));
    const [turn] = chat.active().turns;
    expect(turn?.stage).toBe('verifying');
    expect(turn?.status).toBe('pending');
  });

  it('stream error event fails the turn', async () => {
    const chat = streamChat(async () => { throw Object.assign(new Error('stream'), {code:'agent_error'}); });
    await chat.send(chat.active().id, 'Une question.');
    expect(chat.active().turns[0]?.status).toBe('failed');
    expect(chat.active().turns[0]?.error).toBe('Nova a renvoyé une réponse invalide. Tu peux réessayer.');
  });

  it('failure messages say which part of the chain failed', () => {
    expect(failureMessage({code:'agent_unavailable'})).toMatch(/hors ligne/);
    expect(failureMessage({code:'backend_unavailable'})).toMatch(/serveur de Nova/);
    expect(failureMessage({code:'agent_busy', retryAfter:4.2})).toMatch(/dans 5 s/);
    expect(failureMessage({})).toBe('Réponse indisponible. Tu peux réessayer.');
  });

  it('stream capacity result keeps busy message', async () => {
    const chat = streamChat(async () => ({answer:'Occupé', badge:null, retry_after:5}));
    await chat.send(chat.active().id, 'Une question.');
    const [turn] = chat.active().turns;
    expect(turn?.status).toBe('failed');
    expect(turn?.error).toBe('Occupé');
  });

  it('citation markers are removed from the displayed answer', () => {
    expect(answerBlocks('Une fonction dérivable est continue [[math_4eme_se_002_chunk_003]].')).toStrictEqual([
      {kind:'paragraph', text:'Une fonction dérivable est continue.'},
    ]);
  });

  it('formatted answers retain math, lists, code and HTML as plain text', () => {
    expect(answerBlocks('### Exemple\n\n- $x^2$\n- `x`\n\n```python\nprint("<b>")\n```\n\n<img>')).toStrictEqual([
      {kind:'heading', text:'Exemple'},
      {kind:'list', ordered:false, items:['$x^2$', '`x`']},
      {kind:'code', text:'print("<b>")'},
      {kind:'paragraph', text:'<img>'},
    ]);
  });

  it('inline formatting leaves incomplete delimiters intact', () => {
    expect(answerInline('**unfinished')).toStrictEqual([{kind:'math', text:'**unfinished'}]);
    expect(answerInline('`unfinished')).toStrictEqual([{kind:'math', text:'`unfinished'}]);
    expect(answerInline('Use **this $x^2$** and `<b>`.')).toStrictEqual([
      {kind:'math', text:'Use '}, {kind:'strong', text:'this $x^2$'},
      {kind:'math', text:' and '}, {kind:'code', text:'<b>'}, {kind:'math', text:'.'},
    ]);
  });
});
