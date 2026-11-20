import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {plural} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useId, useRef, type ReactNode, type Ref} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Directional} from '../../ui/Directional';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {useGreetingMood} from '../../lib/nova-moments';
import {Mascot, type MascotMood} from '../../ui/Mascot';
import {MasteryTessera} from '../../ui/MasteryTessera';
import {MASTERY_WORDS, Mosaic, MosaicLegend} from '../../ui/Mosaic';
import {Streak} from '../../ui/Streak';
import {mosaicShare, type Chapter} from './queries';
import {intlLocale} from '../../lib/i18n-store';

export interface HomeSummary {
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
}

export interface HomeOverviewProps {
  pseudo: string;
  /** Translated subtitle line under the greeting (presentation choice), if any. */
  aside?: string;
  /** null while loading. */
  chapters: readonly Chapter[] | null;
  chaptersError?: {message: string; onRetry: () => void};
  translateLabel: (label: string) => string;
  selectedId: string | null;
  weakestId: string | null;
  onSelect: (id: string) => void;
  onPractise: (chapter: Chapter) => void;
  onAsk: () => void;
  /** null while loading. */
  summary: HomeSummary | null;
  summaryError?: {message: string; onRetry: () => void};
  sessionRunning: boolean;
  onStartSession: () => void;
  lastSession?: {topic: string; onOpen: () => void};
  /** "Tes outils", when the learner kept any. */
  tools?: ReactNode;
}

const styles = stylex.create({
  page: {display: 'grid', gap: {default: en.space8, '@media (width < 640px)': en.space6}, minInlineSize: 0},
  head: {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: en.space4},
  hello: {display: 'grid', gap: en.space2, minInlineSize: 0, overflowWrap: 'anywhere'},
  sub: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading},
  aside: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  resume: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space3,
    minInlineSize: 0,
    maxInlineSize: {default: '22rem', '@media (width < 640px)': '100%'},
    inlineSize: {default: 'auto', '@media (width < 640px)': '100%'},
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    textAlign: 'start',
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    borderColor: {default: en.line, '@media (hover: hover)': {default: en.line, ':hover': en.lineStrong}},
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
  resumeIcon: {display: 'inline-flex', color: en.argileStrong},
  resumeText: {display: 'grid', gap: 2, minInlineSize: 0, flexGrow: 1},
  resumeTopic: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
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
  card: {
    display: 'grid',
    gap: en.space6,
    minInlineSize: 0,
    padding: {default: en.space6, '@media (width < 640px)': en.space4},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  board: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 1100px)': 'minmax(0, 1fr) 18rem'},
    alignItems: 'start',
    gap: en.space6,
    minInlineSize: 0,
  },
  field: {display: 'grid', gap: en.space4, minInlineSize: 0},
  score: {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: `${en.space3} ${en.space6}`},
  share: {display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: `0 ${en.space3}`, margin: 0, minInlineSize: 0},
  numeral: {
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: 'clamp(2.75rem, 2rem + 3vw, 4rem)',
    lineHeight: 1,
    fontWeight: en.typeDisplayWeight,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  shareText: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  emptyTitle: {margin: 0, color: en.ink, fontFamily: en.fontDisplay, fontSize: en.typeTitleSize, lineHeight: en.typeTitleLeading, fontWeight: en.typeTitleWeight},
  emptyText: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  scoreText: {display: 'grid', gap: en.space1, minInlineSize: 0},
  panel: {
    display: 'grid',
    alignContent: 'start',
    gap: en.space4,
    minInlineSize: 0,
    padding: en.space5,
    borderRadius: en.radiusLg,
    backgroundColor: en.surfaceSunken,
  },
  nova: {display: 'flex', alignItems: 'center', gap: en.space3},
  novaText: {display: 'grid', gap: 2, minInlineSize: 0},
  novaTitle: {margin: 0, color: en.ink, fontFamily: en.fontDisplay, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
  focus: {display: 'flex', alignItems: 'flex-start', gap: en.space3, minInlineSize: 0},
  focusText: {display: 'grid', gap: en.space1, minInlineSize: 0, overflowWrap: 'anywhere'},
  chapter: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading, fontWeight: 700},
  caption: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  tag: {
    justifySelf: 'start',
    paddingInline: en.space2,
    borderRadius: en.radiusTessera,
    backgroundColor: en.ocreSoft,
    color: en.ocreInk,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
  },
  action: {display: 'grid'},
  stats: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(2, minmax(0, 1fr))'},
    gap: en.space4,
  },
  stat: {
    display: 'grid',
    alignContent: 'start',
    gap: en.space3,
    minInlineSize: 0,
    padding: en.space5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
  },
  minutes: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeNumeralSize,
    lineHeight: en.typeNumeralLeading,
    fontWeight: en.typeNumeralWeight,
    fontVariantNumeric: 'tabular-nums',
  },
  statAction: {display: 'flex', flexWrap: 'wrap', gap: en.space2},
  tools: {display: 'grid', gap: en.space3},
  toolsTitle: {margin: 0, color: en.ink, fontFamily: en.fontDisplay, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
});

const NBSP = ' ';

/** "45 min", "1 h 05", "45 د", "1 س 05": the old card's format, with Arabic units for Arabic. */
export function formatMinutes(total: number, locale: string): string {
  const numbers = new Intl.NumberFormat(intlLocale(locale));
  const [hourUnit, minuteUnit] = locale === 'ar' ? ['س', 'د'] : ['h', 'min'];
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${numbers.format(minutes)}${NBSP}${minuteUnit}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${numbers.format(hours)}${NBSP}${hourUnit}${NBSP}${String(rest).padStart(2, '0')}` : `${numbers.format(hours)}${NBSP}${hourUnit}`;
}

function Kicker({children}: {children: ReactNode}) {
  return <p {...stylex.props(styles.kicker)}>{children}</p>;
}

function NextStep({
  chapter,
  weakest,
  translateLabel,
  onPractise,
  onAsk,
  mood,
  ref,
}: {
  mood: MascotMood;
  ref?: Ref<HTMLElement>;
  chapter: Chapter | null;
  weakest: boolean;
  translateLabel: (label: string) => string;
  onPractise: (chapter: Chapter) => void;
  onAsk: () => void;
}) {
  const {i18n, t} = useLingui();
  const attempts = chapter?.attempts ?? 0;
  const confusions = chapter?.confusions ?? 0;
  return (
    <aside ref={ref} aria-label={t`Prochaine étape`} aria-live="polite" {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.nova)}>
        <Mascot mood={mood} breathe size={56} />
        <div {...stylex.props(styles.novaText)}>
          <Kicker>
            <Trans>Nova te propose</Trans>
          </Kicker>
          <h2 {...stylex.props(styles.novaTitle)}>
            <Trans>Ta prochaine étape</Trans>
          </h2>
        </div>
      </div>
      {chapter ? (
        <>
          <div {...stylex.props(styles.focus)}>
            <MasteryTessera level={chapter.level} size={40} label="" />
            <div {...stylex.props(styles.focusText)}>
              {weakest && (
                <span {...stylex.props(styles.tag)}>
                  <Trans>À renforcer</Trans>
                </span>
              )}
              <h3 {...stylex.props(styles.chapter)}>{translateLabel(chapter.label)}</h3>
              <p {...stylex.props(styles.caption)}>
                {i18n._(MASTERY_WORDS[chapter.level])}
                {attempts > 0 &&
                  ` · ${t`${plural(attempts, {one: '# essai', other: '# essais'})}`} · ${t`${plural(confusions, {one: '# confusion', other: '# confusions'})}`}`}
              </p>
            </div>
          </div>
          <div {...stylex.props(styles.action)}>
            <Button
              variant="primary"
              label={t`S’entraîner sur ce chapitre`}
              icon={<Icon name="target" size={20} />}
              onClick={() => onPractise(chapter)}
            />
          </div>
        </>
      ) : (
        <>
          <p {...stylex.props(styles.emptyText)}>
            <Trans>Choisis une pièce de la mosaïque pour t’entraîner sur ce chapitre.</Trans>
          </p>
          <div {...stylex.props(styles.action)}>
            <Button variant="secondary" label={t`Poser ma première question`} icon={<Icon name="chat" size={20} />} onClick={onAsk} />
          </div>
        </>
      )}
    </aside>
  );
}

function MosaicSkeleton() {
  return <Skeleton width="100%" height="22rem" radius={3} />;
}

export function HomeOverview(props: HomeOverviewProps): React.JSX.Element {
  const {
    pseudo,
    aside,
    chapters,
    chaptersError,
    translateLabel,
    selectedId,
    weakestId,
    onSelect,
    onPractise,
    onAsk,
    summary: totals,
    summaryError,
    sessionRunning,
    onStartSession,
    lastSession,
    tools,
  } = props;
  const {i18n, t} = useLingui();
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  // On a phone the next step sits under the mosaic: bring it into view when a tile is picked.
  const pick = (id: string) => {
    onSelect(id);
    requestAnimationFrame(() => {
      const box = panel.current?.getBoundingClientRect();
      if (!box || (box.top >= 0 && box.bottom <= window.innerHeight)) return;
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel.current?.scrollIntoView({block: 'nearest', behavior: still ? 'auto' : 'smooth'});
    });
  };
  const mosaicTitleId = useId();
  const evaluated = chapters?.some(chapter => chapter.mastery != null) ?? false;
  const selected = chapters?.find(chapter => chapter.id === selectedId) ?? null;
  const share = new Intl.NumberFormat(intlLocale(i18n.locale), {style: 'percent', maximumFractionDigits: 0}).format(chapters ? mosaicShare(chapters) : 0);
  const tiles = chapters?.map(chapter => ({id: chapter.id, label: translateLabel(chapter.label), level: chapter.level, size: chapter.size})) ?? [];
  // Named for the catalog placeholder: "Cette semaine : {summary}".
  const greeting = useGreetingMood(totals?.streakDays);
  const summary = totals ? formatMinutes(totals.weekMinutes, i18n.locale) : '';

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.hello)}>
          <Heading level={1} type="display-3" id={titleId}>
            <Trans>Bonjour</Trans>, <span translate="no">{pseudo}</span>
          </Heading>
          <p {...stylex.props(styles.sub)}>
            <Trans>Ton espace de révision</Trans>
          </p>
          {aside && <p {...stylex.props(styles.aside)}>{aside}</p>}
        </div>
        {lastSession && (
          <button type="button" onClick={lastSession.onOpen} {...stylex.props(styles.resume)}>
            <span {...stylex.props(styles.resumeIcon)}>
              <Icon name="chat" size={20} />
            </span>
            <span {...stylex.props(styles.resumeText)}>
              <span {...stylex.props(styles.kicker)}>
                <Trans>Reprendre ·</Trans> <Trans>cette visite</Trans>
              </span>
              <span translate="no" {...stylex.props(styles.resumeTopic)}>
                {lastSession.topic}
              </span>
            </span>
            <Directional>
              <Icon name="chevron-right" size={20} />
            </Directional>
          </button>
        )}
      </header>

      <section aria-labelledby={mosaicTitleId} {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.board)}>
          <div {...stylex.props(styles.field)}>
            <div {...stylex.props(styles.score)}>
              <div {...stylex.props(styles.scoreText)}>
                <h2 id={mosaicTitleId} {...stylex.props(styles.kicker)}>
                  <Trans>Carte des chapitres</Trans>
                </h2>
                {chapters && evaluated && (
                  <p {...stylex.props(styles.share)}>
                    <span {...stylex.props(styles.numeral)}>{share}</span>
                    <span {...stylex.props(styles.shareText)}>
                      <Trans>de ta mosaïque est posée</Trans>
                    </span>
                  </p>
                )}
                {chapters && !evaluated && (
                  <>
                    <p {...stylex.props(styles.emptyTitle)}>
                      <Trans>Pas encore de données</Trans>
                    </p>
                    <p {...stylex.props(styles.emptyText)}>
                      <Trans>Ta carte se remplit dès ta première question.</Trans>
                    </p>
                  </>
                )}
              </div>
              {chapters && chapters.length > 0 && <MosaicLegend />}
            </div>
            {chaptersError ? (
              <ErrorBanner message={chaptersError.message} onRetry={chaptersError.onRetry} />
            ) : chapters ? (
              <Mosaic tiles={tiles} label={t`Carte des chapitres`} columns={5} selectedId={selectedId} onSelect={pick} />
            ) : (
              <MosaicSkeleton />
            )}
          </div>
          <NextStep
            ref={panel}
            mood={greeting}
            chapter={selected}
            weakest={selected !== null && selected.id === weakestId}
            translateLabel={translateLabel}
            onPractise={onPractise}
            onAsk={onAsk}
          />
        </div>
      </section>

      {summaryError && !totals ? (
        <ErrorBanner message={summaryError.message} onRetry={summaryError.onRetry} />
      ) : (
        <div {...stylex.props(styles.stats)}>
          <article aria-label={t`Aujourd’hui`} {...stylex.props(styles.stat)}>
            <Kicker>
              <Trans>Aujourd’hui</Trans>
            </Kicker>
            {totals ? (
              <>
                <p {...stylex.props(styles.minutes)}>{formatMinutes(totals.todayMinutes, i18n.locale)}</p>
                <p {...stylex.props(styles.caption)}>{t`Cette semaine : ${summary}`}</p>
              </>
            ) : (
              <Skeleton width="8rem" height="3.5rem" />
            )}
            <div {...stylex.props(styles.statAction)}>
              <Button
                variant="secondary"
                label={sessionRunning ? t`Séance en cours` : t`Commencer une séance`}
                icon={<Icon name="play" size={20} />}
                isDisabled={sessionRunning}
                onClick={onStartSession}
              />
            </div>
          </article>
          <article aria-label={t`Série`} {...stylex.props(styles.stat)}>
            <Kicker>
              <Trans>Série</Trans>
            </Kicker>
            {totals ? <Streak days={totals.streakDays} /> : <Skeleton width="12rem" height="3.5rem" />}
          </article>
        </div>
      )}

      {tools && (
        <section aria-label={t`Tes outils`} {...stylex.props(styles.tools)}>
          <h2 {...stylex.props(styles.toolsTitle)}>
            <Trans>Tes outils</Trans>
          </h2>
          {tools}
        </section>
      )}
    </section>
  );
}
