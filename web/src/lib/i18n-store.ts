export const LOCALES = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const toLocale = (value: unknown): Locale => (LOCALES as readonly unknown[]).includes(value) ? (value as Locale) : 'fr';
export const directionOf = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr');

/** BCP 47 tag for Intl. Arabic keeps Western digits, as Tunisian textbooks do. */
export const intlLocale = (locale: string): string => (locale === 'ar' ? 'ar-TN-u-nu-latn' : locale);

const listeners = new Set<() => void>();
let locale: Locale = 'fr';
try { locale = toLocale(globalThis.localStorage?.getItem('ednova-locale')); } catch {}

export const getLocale = (): Locale => locale;
export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(value: string) {
  const next = toLocale(value);
  if (globalThis.document) {
    document.documentElement.lang = next;
    document.documentElement.dir = directionOf(next);
  }
  if (next === locale) return;
  locale = next;
  try { globalThis.localStorage?.setItem('ednova-locale', next); } catch {}
  for (const listener of listeners) listener();
}
