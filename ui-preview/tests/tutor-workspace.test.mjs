import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorWorkspace, answerBlocks, answerInline} from '../src/tutor-workspace.mjs';

test('a late reply updates its originating thread and subject', async () => {
  let finish;
  const calls = [];
  const chat = createTutorWorkspace({request(method, path, {json}) {
    calls.push({method, path, json});
    return path === '/tutor/sessions' ? {id:'history-session'} : new Promise(resolve => {finish = resolve;});
  }});
  const history = chat.active().id;
  chat.setSubject(history, 'history');
  const sending = chat.send(history, 'Explique la Révolution française.');
  assert.equal(chat.active().turns[0].status, 'pending');
  const physics = chat.newThread({subject:'physics', mode:'guided'});
  await Promise.resolve();
  finish({answer:'En 1789…'});
  await sending;
  assert.equal(chat.active().id, physics);
  assert.deepEqual(chat.active().turns, []);
  chat.select(history);
  assert.equal(chat.active().turns[0].result.answer, 'En 1789…');
  assert.deepEqual(calls[0].json, {subject:'history'});
  assert.equal(calls[1].path, '/tutor/sessions/history-session/messages');
});

test('retry reuses the session and student message after a waiting response', async () => {
  const paths = [];
  const chat = createTutorWorkspace({async request(method, path) {
    paths.push(path);
    if (paths.length === 1) return {id:'s'};
    return paths.length === 2
      ? {answer:'Attends.', badge:null, retry_after:3}
      : {answer:'Un indice', badge:'hint', mode:'guided', hint_rung:0};
  }});
  const id = chat.active().id;
  chat.setMode(id, 'guided');
  await chat.send(id, 'Un exercice.', 'new_question');
  assert.equal(chat.active().turns[0].error, 'Attends.');
  await chat.retry(id);
  assert.equal(chat.active().turns.length, 1);
  assert.equal(chat.active().turns[0].result.hint_rung, 0);
  assert.deepEqual(paths, ['/tutor/sessions','/tutor/sessions/s/messages','/tutor/sessions/s/messages']);
});

test('clearing the visit discards pending responses and transcript titles', async () => {
  let finish;
  const chat = createTutorWorkspace({request(method, path) {
    return path === '/tutor/sessions' ? {id:'old'} : new Promise(resolve => {finish = resolve;});
  }});
  const sending = chat.send(chat.active().id, 'Un texte privé.');
  await Promise.resolve();
  chat.clear();
  finish({answer:'Un ancien résultat.'});
  await sending;
  assert.equal(chat.getSnapshot().threads.length, 1);
  assert.deepEqual(chat.active().turns, []);
});

test('formatted answers retain math, lists, code and HTML as plain text', () => {
  assert.deepEqual(answerBlocks('### Exemple\n\n- $x^2$\n- `x`\n\n```python\nprint("<b>")\n```\n\n<img>'), [
    {kind:'heading', text:'Exemple'},
    {kind:'list', ordered:false, items:['$x^2$', '`x`']},
    {kind:'code', text:'print("<b>")'},
    {kind:'paragraph', text:'<img>'},
  ]);
});

test('inline formatting leaves incomplete delimiters intact', () => {
  assert.deepEqual(answerInline('**unfinished'), [{kind:'math',text:'**unfinished'}]);
  assert.deepEqual(answerInline('`unfinished'), [{kind:'math',text:'`unfinished'}]);
  assert.deepEqual(answerInline('Use **this $x^2$** and `<b>`.'), [
    {kind:'math',text:'Use '},{kind:'strong',text:'this $x^2$'},
    {kind:'math',text:' and '},{kind:'code',text:'<b>'},{kind:'math',text:'.'},
  ]);
});
