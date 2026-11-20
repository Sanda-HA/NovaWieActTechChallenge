import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, type ReactNode} from 'react';
import {useSession, useStore} from '../../app/session';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {Tessera} from '../../ui/Mosaic';
import {Streak} from '../../ui/Streak';
import {formatMinutes} from '../accueil/HomeOverview';
import {ScreenTitle} from '../ScreenTitle';
import {History} from './History';
import {useStudySessions} from './queries';
import {TimerControls} from './TimerControls';

const styles = stylex.create({
  page: {display: 'grid', gap: {default: en.space8, '@media (width < 640px)': en.space6}, minInlineSize: 0},
  board: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 1000px)': 'minmax(0, 1fr) 20rem'},
    alignItems: 'start',
    gap: en.space6,
    minInlineSize: 0,
  },
  card: {
    display: 'grid',
    gap: en.space5,
    minInlineSize: 0,
    padding: {default: en.space6, '@media (width < 640px)': en.space4},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  h2: {margin: 0, color: en.ink, fontFamily: en.fontDisplay, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
  caption: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading, textWrap: 'pretty'},
  body: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  set: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space4,
    minInlineSize: 0,
    padding: en.space4,
    borderRadius: en.radiusLg,
    backgroundColor: en.surfaceSunken,
  },
  tile: {display: 'grid', flexShrink: 0, inlineSize: '6rem', blockSize: '4.5rem'},
  setText: {display: 'grid', gap: en.space1, minInlineSize: 0},
  setTitle: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading, fontWeight: 700},
  stats: {display: 'grid', gap: en.space4, margin: 0, minInlineSize: 0},
  stat: {
    display: 'grid',
    gap: en.space2,
    minInlineSize: 0,
    margin: 0,
    padding: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
  },
  kicker: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  value: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeNumeralSize,
    lineHeight: en.typeNumeralLeading,
    fontWeight: en.typeNumeralWeight,
    fontVariantNumeric: 'tabular-nums',
  },
  section: {display: 'grid', gap: en.space3, minInlineSize: 0},
  action: {display: 'flex', flexWrap: 'wrap'},
  novaRow: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
});

export function Component(): React.JSX.Element {
  const {timer} = useSession();
  const state = useStore(timer);
  const {i18n, t} = useLingui();
  const history = useStudySessions(state.phase);

  // The home screen does the same: a session started elsewhere must show here.
  useEffect(() => void timer.refresh(), [timer]);

  const {summary, phase} = state;
  const minutes = Math.round(state.durationMs / 60000);
  const loadFailed = t`Chargement indisponible. Réessaie.`;
  const stat = (label: string, value: ReactNode) => (
    <div {...stylex.props(styles.stat)}>
      <dt {...stylex.props(styles.kicker)}>{label}</dt>
      <dd {...stylex.props(styles.value)}>{value}</dd>
    </div>
  );

  return (
    <div {...stylex.props(styles.page)}>
      <ScreenTitle>
        <Trans>Temps d’étude</Trans>
      </ScreenTitle>

      <div {...stylex.props(styles.board)}>
        <section aria-label={t`Minuteur de concentration`} {...stylex.props(styles.card)}>
          <div {...stylex.props(styles.novaRow)}>
            <Mascot mood={phase === 'break' ? 'sleep' : phase === 'done' ? 'cheer' : 'idle'} size={72} />
            <div {...stylex.props(styles.section)}>
              <h2 {...stylex.props(styles.h2)}>
                <Trans>Minuteur de concentration</Trans>
              </h2>
              <p {...stylex.props(styles.caption)}>
                <Trans>Le minuteur reste en haut de l’écran sur toutes les pages. Seul le temps en cours compte dans tes statistiques.</Trans>
              </p>
              {phase === 'paused' && (
                <p role="status" {...stylex.props(styles.caption)}>
                  <Trans>Séance en pause : reprends quand tu veux.</Trans>
                </p>
              )}
              {phase === 'break' && (
                <p role="status" {...stylex.props(styles.caption)}>
                  <Trans>Pause de 5 minutes : Nova fait une sieste. Ce temps ne compte pas dans tes statistiques.</Trans>
                </p>
              )}
            </div>
          </div>
          <TimerControls large />
          {phase === 'done' && (
            <div {...stylex.props(styles.set)}>
              <div {...stylex.props(styles.tile)}>
                <Tessera label={formatMinutes(minutes, i18n.locale)} level="strong" glazeOnMount />
              </div>
              <div {...stylex.props(styles.setText)}>
                <p {...stylex.props(styles.setTitle)}>
                  <Trans>Séance terminée. Bravo !</Trans>
                </p>
                <p {...stylex.props(styles.caption)}>
                  <Trans>Une tuile de plus pour ta mosaïque.</Trans>
                </p>
              </div>
            </div>
          )}
        </section>

        <section aria-label={t`Tes statistiques`} {...stylex.props(styles.section)}>
          <h2 {...stylex.props(styles.h2)}>
            <Trans>Tes statistiques</Trans>
          </h2>
          {summary ? (
            <dl {...stylex.props(styles.stats)}>
              {stat(t`Aujourd’hui`, formatMinutes(summary.minutes_today ?? 0, i18n.locale))}
              {stat(t`Cette semaine`, formatMinutes(summary.minutes_week ?? 0, i18n.locale))}
              {stat(t`Série`, <Streak days={summary.streak_days ?? 0} />)}
            </dl>
          ) : state.error && !state.busy ? (
            <ErrorBanner message={loadFailed} onRetry={() => void timer.refresh()} />
          ) : (
            <Skeleton width="100%" height="12rem" />
          )}
        </section>
      </div>

      <section aria-label={t`Séances récentes`} {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.h2)}>
          <Trans>Séances récentes</Trans>
        </h2>
        <History sessions={history.data} failed={history.isError} onRetry={() => void history.refetch()} />
      </section>

      <section aria-label={t`Réviser à plusieurs`} {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.h2)}>
          <Trans>Réviser à plusieurs</Trans>
        </h2>
        <p {...stylex.props(styles.body)}>
          <Trans>Les séances de groupe se lancent dans une salle d’étude, avec Nova comme animatrice.</Trans>
        </p>
        <div {...stylex.props(styles.action)}>
          <Button
            variant="secondary"
            label={t`Aller à la salle d’étude`}
            icon={<Icon name="users" size={20} />}
            href="/salle"
          />
        </div>
      </section>
    </div>
  );
}
