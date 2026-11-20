import {afterEach, describe, expect, it} from 'vitest';
import {getLocale, intlLocale, setLocale} from './i18n-store';

afterEach(() => {
  setLocale('fr');
  document.documentElement.removeAttribute('dir');
});

describe('i18n store', () => {
  it('sets right-to-left and the language for Arabic', () => {
    setLocale('ar');
    expect(getLocale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem('ednova-locale')).toBe('ar');
  });

  it('goes back to left-to-right for French and English', () => {
    setLocale('ar');
    setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each(['de', '', 'AR', 'ar-TN'])('falls back to French for the unknown locale %j', value => {
    setLocale('ar');
    setLocale(value);
    expect(getLocale()).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('formats Arabic with Western digits', () => {
    expect(new Intl.NumberFormat(intlLocale('ar')).format(365)).toBe('365');
    expect(intlLocale('fr')).toBe('fr');
  });
});
