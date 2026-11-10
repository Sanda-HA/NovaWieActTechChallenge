import assert from 'node:assert/strict';
import test from 'node:test';
import {getLocale, localizedReact, setLocale, subscribeLocale, translate} from '../src/i18n.mjs';

test('switching language notifies the current screen and keeps diagnostic answer IDs', () => {
  const values = [];
  const unsubscribe = subscribeLocale(() => values.push(getLocale()));
  const React = {Fragment:Symbol('Fragment'),createElement:(_type,props,...children) => ({props,children})};
  const {createElement} = localizedReact(React);
  const answer = {id:'L’expliquer sans notes',label:'L’expliquer sans notes'};
  try {
    setLocale('fr');
    assert.equal(translate('Passer les questions'),'Passer les questions');
    setLocale('en');
    assert.deepEqual(values,['en']);
    assert.equal(translate('Passer les questions'),'Skip questions');
    const card = createElement('quiz',{choices:[answer]});
    assert.deepEqual(card.props.choices,[{id:answer.id,label:'Explain it without notes'}]);
    assert.equal(answer.label,'L’expliquer sans notes');
    assert.equal(createElement('span',{translate:'no'},'Réglages').children[0],'Réglages');
    setLocale('fr');
    assert.deepEqual(values,['en','fr']);
  } finally {
    unsubscribe();
    setLocale('fr');
  }
});
