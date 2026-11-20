import * as stylex from '@stylexjs/stylex';
import {plural} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {en} from '../../theme/ednova.stylex';
import {MasteryTessera} from '../../ui/MasteryTessera';
import {MASTERY_WORDS, type MasteryLevel} from '../../ui/Mosaic';
import {intlLocale} from '../../lib/i18n-store';

const SEGMENTS = 10;

const tone = stylex.create({
  unknown: {backgroundColor: en.line},
  weak: {backgroundColor: en.masteryWeak},
  medium: {backgroundColor: en.masteryMedium},
  strong: {backgroundColor: en.masteryStrong},
});

const styles = stylex.create({
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: en.space3,
    rowGap: en.space1,
    minInlineSize: 0,
    paddingBlock: en.space2,
    margin: 0,
    listStyle: 'none',
    color: en.ink,
    fontFamily: en.fontText,
  },
  nested: {paddingInlineStart: en.space6},
  name: {
    minInlineSize: 0,
    margin: 0,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  nameNested: {fontWeight: 400},
  value: {
    color: en.ink,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  valueRaw: {color: en.inkMuted, fontWeight: 400, whiteSpace: 'normal', textAlign: 'end'},
  bar: {
    gridColumn: '2 / 4',
    display: 'flex',
    gap: 2,
    minInlineSize: 0,
  },
  segment: {flexGrow: 1, flexBasis: 0, blockSize: 6, borderRadius: 1.5},
  caption: {
    gridColumn: '2 / 4',
    margin: 0,
    color: en.inkMuted,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});

export interface MasteryRowProps {
  /** Already translated. */
  label: string;
  mastery: number | null;
  level: MasteryLevel;
  attempts: number;
  /** A sub-chapter, indented under its chapter. */
  nested?: boolean;
}

/** One chapter or sub-chapter: its mastery as a share, as ten tesserae and in words. */
export function MasteryRow({label, mastery, level, attempts, nested}: MasteryRowProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const filled = mastery == null ? 0 : Math.round(mastery * SEGMENTS);
  const percent = mastery == null ? null : new Intl.NumberFormat(intlLocale(i18n.locale), {style: 'percent', maximumFractionDigits: 0}).format(mastery);
  const word = i18n._(MASTERY_WORDS[level]);

  return (
    <li {...stylex.props(styles.row, nested && styles.nested)}>
      <MasteryTessera level={level} size={nested ? 18 : 22} label="" />
      <p {...stylex.props(styles.name, nested && styles.nameNested)}>{label}</p>
      <span {...stylex.props(styles.value, percent === null && styles.valueRaw)}>{percent ?? word}</span>
      <div aria-hidden="true" {...stylex.props(styles.bar)}>
        {Array.from({length: SEGMENTS}, (_, index) => (
          <span key={index} {...stylex.props(styles.segment, index < filled ? tone[level] : tone.unknown)} />
        ))}
      </div>
      {percent !== null && (
        <p {...stylex.props(styles.caption)}>
          {word}
          {attempts > 0 && ` · ${t`${plural(attempts, {one: '# essai', other: '# essais'})}`}`}
        </p>
      )}
    </li>
  );
}
