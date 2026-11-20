import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {I18nRoot} from '../i18n';
import {Streak} from './Streak';

describe('Streak', () => {
  it.each([
    [0, 'Série : 0 jour de suite'],
    [1, 'Série : 1 jour de suite'],
    [2, 'Série : 2 jours de suite'],
  ])('follows the French plural rule for %i', (days, name) => {
    render(<I18nRoot><Streak days={days} /></I18nRoot>);
    expect(screen.getByRole('group', {name})).toBeTruthy();
  });

  it.each([
    [0, 'jour'],
    [1, 'jour'],
    [2, 'jours de suite'],
  ])('keeps the old visible unit for %i', (days, unit) => {
    render(<I18nRoot><Streak days={days} /></I18nRoot>);
    expect(screen.getByText(unit, {exact: true})).toBeTruthy();
  });

  it('invites the first session at zero', () => {
    render(<I18nRoot><Streak days={0} /></I18nRoot>);
    expect(screen.getByText('Une séance aujourd’hui fait éclore le premier bouton.')).toBeTruthy();
  });

  it('names the stage and counts down to the next one', () => {
    render(<I18nRoot><Streak days={5} /></I18nRoot>);
    expect(screen.getByText(/Fleur · encore 2 jours avant le palier « Bouquet »/)).toBeTruthy();
  });
});
