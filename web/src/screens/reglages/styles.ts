import * as stylex from '@stylexjs/stylex';
import {en} from '../../theme/ednova.stylex';

export const styles = stylex.create({
  page: {display: 'grid', gap: {default: en.space6, '@media (width < 640px)': en.space5}, minInlineSize: 0, maxInlineSize: '48rem'},
  form: {display: 'grid', gap: {default: en.space6, '@media (width < 640px)': en.space5}, minInlineSize: 0},
  card: {
    display: 'grid',
    gap: en.space4,
    alignContent: 'start',
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
  body: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, overflowWrap: 'anywhere'},
  caption: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading, textWrap: 'pretty'},
  grid3: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(3, minmax(0, 1fr))'},
    gap: en.space3,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(2, minmax(0, 1fr))'},
    gap: en.space3,
  },
  actions: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space3},
  saved: {display: 'inline-flex', alignItems: 'center', gap: en.space2, margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeCaptionSize},
  danger: {display: 'grid', gap: en.space4, minInlineSize: 0},
});
