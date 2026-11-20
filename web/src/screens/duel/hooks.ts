import {useLingui} from '@lingui/react/macro';
import {useEffect, useState} from 'react';
import {useServerText} from '../../i18n/serverText';
import {useTopicCatalog} from '../accueil/queries';
import {intlLocale} from '../../lib/i18n-store';

/** The local clock, refreshed while `active`. */
export function useNow(active: boolean, every = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [active, every]);
  return now;
}

/** Calls `onBack` when the browser comes back online or the tab is shown again. */
export function useReconnect(onBack: () => void) {
  useEffect(() => {
    const visible = () => document.visibilityState === 'visible' && onBack();
    window.addEventListener('online', onBack);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', onBack);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [onBack]);
}

/** The chapter's name from the catalog, or its identifier while the catalog loads. */
export function useTopicLabel(): (slug: string) => string {
  const catalog = useTopicCatalog();
  const serverText = useServerText();
  return slug => {
    const label = catalog.data?.topics?.find(topic => topic.slug === slug)?.label;
    return label ? serverText(label) : slug;
  };
}

/** "Français", "العربية"…: the language of an exam in the learner's interface language. */
export function useLanguageName(): (code: string) => string {
  const {i18n} = useLingui();
  return code => {
    try {
      return new Intl.DisplayNames(intlLocale(i18n.locale), {type: 'language'}).of(code) ?? code;
    } catch {
      return code;
    }
  };
}

export function useClockTime(): (iso: string) => string {
  const {i18n} = useLingui();
  return iso => new Intl.DateTimeFormat(intlLocale(i18n.locale), {timeStyle: 'short'}).format(new Date(iso));
}
