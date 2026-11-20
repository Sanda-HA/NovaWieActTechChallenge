import {i18n, type Messages} from '@lingui/core';
import {I18nProvider} from '@lingui/react';
import {getLocaleDirection, InternationalizationProvider} from '@astryxdesign/core/i18n';
import frFR from '@astryxdesign/core/locales/fr-FR.generated.js';
import {createElement, useLayoutEffect, useSyncExternalStore, type ReactNode} from 'react';
import arSA from '@astryxdesign/core/locales/ar-SA.generated.js';
import {getLocale, subscribeLocale} from '../lib/i18n-store';
import {messages as ar} from './locales/ar.po';
import {messages as en} from './locales/en.po';
import {messages as frSource} from './locales/fr.po';
import {withFrenchSpacing} from './frenchSpacing';

const fr = withFrenchSpacing(frSource);
export const withFrenchFallback = (messages: Messages): Messages => ({...fr, ...Object.fromEntries(Object.entries(messages).filter(([, message]) => message !== ''))});
const CATALOGS = {fr, en, ar: withFrenchFallback(ar)};
const SOURCE_LOCALE = 'fr';

const catalogLocale = (locale: string): string => (locale in CATALOGS ? locale : SOURCE_LOCALE);

// Astryx's own strings ship per regional locale; Arabic uses Tunisia's tag so numbers stay Western.
const ASTRYX_LOCALE: Record<string, string> = {fr: 'fr-FR', ar: 'ar-TN'};

i18n.load(CATALOGS);
i18n.activate(catalogLocale(getLocale()));

// Ids are hashes of the exact French text: a changed space or apostrophe silently falls back to French.
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  i18n.on('missing', ({id, locale}) => {
    const source = (fr as Record<string, unknown>)[id];
    const problem = `Missing ${locale} message ${id}${source === undefined ? ' (not in the fr catalog either)' : `: ${JSON.stringify(source)}`}`;
    if (import.meta.env.MODE === 'test') throw new Error(problem);
    console.warn(problem);
  });
}

interface I18nRootProps {
  children: ReactNode;
  /** For tests and Storybook: setLocale still folds unknown locales into `fr`. */
  localeOverride?: string;
}

export function I18nRoot({children, localeOverride}: I18nRootProps): React.JSX.Element {
  const storeLocale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  const locale = localeOverride ?? storeLocale;
  const direction = getLocaleDirection(locale);

  useLayoutEffect(() => {
    const next = catalogLocale(locale);
    if (i18n.locale !== next) i18n.activate(next);
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  return createElement(
    I18nProvider,
    {i18n},
    // Astryx's own strings (screen-reader labels, dialogs) ship per regional locale and load only when given.
    createElement(InternationalizationProvider, {locale: ASTRYX_LOCALE[locale] ?? locale, messages: {'fr-FR': frFR, 'ar-TN': arSA}, dir: direction, children}),
  );
}
