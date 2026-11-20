import * as stylex from '@stylexjs/stylex';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {useId} from 'react';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Mosaic, MosaicLegend} from '../../ui/Mosaic';
import {mosaicShare} from '../accueil/queries';
import type {MapChapter} from './queries';
import {intlLocale} from '../../lib/i18n-store';

const styles = stylex.create({
  field: {display: 'grid', gap: en.space4, minInlineSize: 0},
  score: {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: `${en.space3} ${en.space6}`},
  scoreText: {display: 'grid', gap: en.space1, minInlineSize: 0},
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
});

export interface ChapterMapProps {
  /** null while loading. */
  chapters: readonly MapChapter[] | null;
  error?: {message: string; onRetry: () => void};
  translateLabel: (label: string) => string;
  openId: string | null;
  onOpen: (id: string) => void;
}

/** The map: the whole catalog as one zellige panel of tesserae, each set to the learner's mastery. A tap opens the chapter. */
export function ChapterMap({chapters, error, translateLabel, openId, onOpen}: ChapterMapProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const titleId = useId();
  const evaluated = chapters?.some(chapter => chapter.mastery != null) ?? false;
  const share = new Intl.NumberFormat(intlLocale(i18n.locale), {style: 'percent', maximumFractionDigits: 0}).format(chapters ? mosaicShare(chapters) : 0);
  const tiles = chapters?.map(chapter => ({id: chapter.id, label: translateLabel(chapter.label), level: chapter.level, size: chapter.size})) ?? [];

  return (
    <div {...stylex.props(styles.field)}>
      <div {...stylex.props(styles.score)}>
        <div {...stylex.props(styles.scoreText)}>
          <h2 id={titleId} {...stylex.props(styles.kicker)}>
            <Trans>Ta mosaïque</Trans>
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
      {error ? (
        <ErrorBanner message={error.message} onRetry={error.onRetry} />
      ) : chapters ? (
        <Mosaic tiles={tiles} label={t`Carte des chapitres`} columns={6} selectedId={openId} onSelect={onOpen} />
      ) : (
        <Skeleton width="100%" height="26rem" radius={3} />
      )}
    </div>
  );
}
