import * as stylex from '@stylexjs/stylex';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {intlLocale} from '../../lib/i18n-store';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {EmptyNote} from '../../ui/EmptyNote';
import {formatMinutes} from '../accueil/HomeOverview';
import type {FinishedSession} from './queries';

const styles = stylex.create({
  list: {display: 'grid', gap: en.space2, margin: 0, padding: 0, listStyle: 'none', minInlineSize: 0},
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: en.space4,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
  },
  when: {minInlineSize: 0, overflowWrap: 'anywhere'},
  minutes: {flexShrink: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums'},
  empty: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
});

export interface HistoryProps {
  /** undefined while loading. */
  sessions: readonly FinishedSession[] | undefined;
  failed: boolean;
  onRetry: () => void;
}

/** Finished study sessions, newest first, as the old "Séances récentes" list. */
export function History({sessions, failed, onRetry}: HistoryProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  if (failed && !sessions) return <ErrorBanner message={t`Chargement indisponible. Réessaie.`} onRetry={onRetry} />;
  if (!sessions) return <Skeleton width="100%" height="4.5rem" />;
  if (sessions.length === 0) {
    return (
      <EmptyNote>
        <p {...stylex.props(styles.empty)}>
          <Trans>Aucune séance terminée pour l’instant. Lance le minuteur pour commencer.</Trans>
        </p>
      </EmptyNote>
    );
  }
  const day = new Intl.DateTimeFormat(intlLocale(i18n.locale) === 'en' ? 'en-GB' : i18n.locale === 'ar' ? intlLocale('ar') : 'fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <ul {...stylex.props(styles.list)}>
      {sessions.map(row => (
        <li key={row.id} {...stylex.props(styles.row)}>
          <span translate="no" {...stylex.props(styles.when)}>
            {day.format(new Date(row.started_at))}
          </span>
          <strong {...stylex.props(styles.minutes)}>{formatMinutes(row.minutes, i18n.locale)}</strong>
        </li>
      ))}
    </ul>
  );
}
