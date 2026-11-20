import type {Messages} from '@lingui/core';
import {describe, expect, it} from 'vitest';
import {frenchSpace, withFrenchSpacing} from './frenchSpacing';

describe('French spacing', () => {
  it('binds ? ! ; with a narrow no-break space and : with a no-break space', () => {
    expect(frenchSpace('Prêt ? Oui ! Score : 3 ; fin')).toBe('Prêt\u202f? Oui\u202f! Score\u00a0: 3\u202f; fin');
  });

  it('leaves clocks, links and English alone', () => {
    expect(frenchSpace('25:00 https://ednova.tn Ready? Score: 3')).toBe('25:00 https://ednova.tn Ready? Score: 3');
  });

  it('reaches the strings inside compiled plurals but not their keys', () => {
    const compiled: Messages = {a: ['Série : ', ['n', 'plural', {one: ['# jour ?'], other: ['# jours ?']}]], b: 'Quoi ?'};
    expect(withFrenchSpacing(compiled)).toStrictEqual({
      a: ['Série\u00a0: ', ['n', 'plural', {one: ['# jour\u202f?'], other: ['# jours\u202f?']}]],
      b: 'Quoi\u202f?',
    });
  });
});
