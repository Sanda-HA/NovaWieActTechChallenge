import {i18n} from '@lingui/core';
import {plural} from '@lingui/core/macro';
import {generateMessageId} from '@lingui/message-utils/generateMessageId';
import {Trans, useLingui} from '@lingui/react/macro';
import {act, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {setLocale} from '../lib/i18n-store';
import {I18nRoot, withFrenchFallback} from './index';
import {translateServerText} from './serverText';

const NBSP = String.fromCharCode(0xa0);

const PO_FILES = import.meta.glob<string>('./locales/*.po', {query: '?raw', import: 'default', eager: true});

function poEntries(locale: string): Map<string, string> {
  const text = PO_FILES[`./locales/${locale}.po`] ?? '';
  const entries = new Map<string, string>();
  for (const [, id, str] of text.matchAll(/^msgid "(.*)"\r?\nmsgstr "(.*)"\r?$/gmu)) if (id) entries.set(id, str ?? '');
  return entries;
}

function Streak({days}: {days: number}): React.JSX.Element {
  const {t} = useLingui();
  return <p data-testid="streak">{t`Série\u00a0: ${plural(days, {one: '#\u00a0jour', other: '#\u00a0jours'})} de suite`}</p>;
}

afterEach(() => {
  setLocale('fr');
  document.documentElement.removeAttribute('dir');
});

describe('I18nRoot', () => {
  it('renders the French source when the locale is fr', () => {
    render(
      <I18nRoot>
        <Trans>Temps d’étude</Trans>
      </I18nRoot>,
    );
    expect(screen.getByText('Temps d’étude')).toBeTruthy();
  });

  it('renders the English catalog entry when the locale is en', () => {
    setLocale('en');
    render(
      <I18nRoot>
        <Trans>Temps d’étude</Trans>
      </I18nRoot>,
    );
    expect(screen.getByText('Study time')).toBeTruthy();
  });

  it('re-renders when the locale store changes', () => {
    render(
      <I18nRoot>
        <Trans>Temps d’étude</Trans>
      </I18nRoot>,
    );
    expect(screen.getByText('Temps d’étude')).toBeTruthy();
    act(() => setLocale('en'));
    expect(screen.getByText('Study time')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it.each([
    [0, `Série${NBSP}: 0${NBSP}jour de suite`],
    [1, `Série${NBSP}: 1${NBSP}jour de suite`],
    [2, `Série${NBSP}: 2${NBSP}jours de suite`],
  ])('follows the French plural rule for %i days', (days, text) => {
    render(
      <I18nRoot>
        <Streak days={days} />
      </I18nRoot>,
    );
    expect(screen.getByTestId('streak').textContent).toBe(text);
  });

  it.each([
    [0, 'Streak: 0 days'],
    [1, 'Streak: 1 day'],
    [2, 'Streak: 2 days'],
  ])('follows the English plural rule for %i days', (days, text) => {
    setLocale('en');
    render(
      <I18nRoot>
        <Streak days={days} />
      </I18nRoot>,
    );
    expect(screen.getByTestId('streak').textContent).toBe(text);
  });

  it('renders Arabic right to left with the Arabic catalog', () => {
    setLocale('ar');
    render(
      <I18nRoot>
        <Trans>Temps d’étude</Trans>
      </I18nRoot>,
    );
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByText('وقت الدراسة')).toBeTruthy();
  });

  it.each([
    [1, 'يوم واحد'],
    [2, 'يومان متتاليان'],
    [3, '3 أيام متتالية'],
    [11, '11 يومًا متتاليًا'],
  ])('uses the Arabic plural form for %i days', (days, text) => {
    setLocale('ar');
    render(
      <I18nRoot>
        <Streak days={days} />
      </I18nRoot>,
    );
    expect(screen.getByTestId('streak').textContent).toBe(`سلسلة الأيام: ${text}`);
  });

  it('falls back to the French text for a message missing from the Arabic catalog', () => {
    const id = generateMessageId('Temps d’étude');
    expect(withFrenchFallback({})[id]).toStrictEqual(['Temps d’étude']);
    expect(withFrenchFallback({[id]: ''})[id]).toStrictEqual(['Temps d’étude']);
    expect(withFrenchFallback({[id]: 'وقت الدراسة'})[id]).toBe('وقت الدراسة');
  });

  it('fails the test run on a message that is in no catalog', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <I18nRoot>
          <Trans>Ce texte n’existe dans aucun catalogue</Trans>
        </I18nRoot>,
      ),
    ).toThrow(/Missing fr message/);
    quiet.mockRestore();
  });

  it('gives every French source message an English translation', () => {
    const en = poEntries('en');
    const fr = poEntries('fr');
    expect(fr.size).toBeGreaterThan(500);
    const untranslated = [...fr.keys()].filter(id => !en.get(id));
    expect(untranslated).toStrictEqual([]);
  });

  it('gives every English message an Arabic translation with the same placeholders', () => {
    const en = poEntries('en');
    const ar = poEntries('ar');
    const names = (text: string) => [...text.matchAll(/{(w+)(?=[,}])/g)].map(match => match[1]).sort();
    const problems: string[] = [];
    for (const [id, english] of en) {
      const arabic = ar.get(id);
      if (!arabic) problems.push(`missing: ${id}`);
      else if (names(english).join() !== names(arabic).join()) problems.push(`placeholders: ${id}`);
      else if (/plural,/.test(arabic) && !/other {/.test(arabic)) problems.push(`plural without other: ${id}`);
    }
    expect(problems).toStrictEqual([]);
    expect([...ar.keys()].filter(id => !en.has(id))).toStrictEqual([]);
  });

  it('translates backend French text through the obsolete Arabic entries', () => {
    setLocale('ar');
    render(
      <I18nRoot>
        <p />
      </I18nRoot>,
    );
    expect(translateServerText(i18n, 'Dérivabilité')).toBe('قابلية الاشتقاق');
  });

  it('keeps every obsolete English server-text entry in the Arabic catalog', () => {
    const obsolete = (locale: string) => new Set([...(PO_FILES[`./locales/${locale}.po`] ?? '').matchAll(/^#~ msgid "(.*)"\r?$/gmu)].map(match => match[1]));
    const en = obsolete('en');
    const ar = obsolete('ar');
    expect(en.size).toBeGreaterThan(100);
    expect([...en].filter(id => !ar.has(id))).toStrictEqual([]);
  });
});
