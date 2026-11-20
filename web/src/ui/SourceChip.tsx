import * as stylex from '@stylexjs/stylex';
import {useLingui} from '@lingui/react/macro';
import {en} from '../theme/ednova.stylex';
import {Icon} from './icons';

export interface SourceChipProps {
  page: number;
  /** A title, not a sentence: shown as it is in every language. */
  book?: string;
}

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: en.space2,
    maxInlineSize: '100%',
    paddingBlock: en.space1,
    paddingInline: en.space2,
    borderRadius: en.radiusSm,
    backgroundColor: en.faienceSoft,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  book: {minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600},
  page: {flexShrink: 0, whiteSpace: 'nowrap'},
});

/** Where an answer comes from: the textbook and the page. */
export function SourceChip({page, book = 'Manuel, tome 2'}: SourceChipProps): React.JSX.Element {
  const {t} = useLingui();
  return (
    <span role="note" aria-label={t`Source : ${book}, page ${page}`} {...stylex.props(styles.chip)}>
      <Icon name="book" size={16} />
      <span {...stylex.props(styles.book)}>{book}</span>
      <span {...stylex.props(styles.page)}>{t`p. ${page}`}</span>
    </span>
  );
}
