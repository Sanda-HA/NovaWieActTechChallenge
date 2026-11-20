import * as stylex from '@stylexjs/stylex';
import {en} from '../../theme/ednova.stylex';

export const shared = stylex.create({
  section: {display: 'grid', gap: en.space3, minInlineSize: 0},
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
  h2: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    overflowWrap: 'anywhere',
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
  body: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, overflowWrap: 'anywhere'},
  muted: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, textWrap: 'pretty'},
  caption: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading, textWrap: 'pretty'},
  actions: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2},
  list: {display: 'grid', gap: en.space2, margin: 0, padding: 0, listStyle: 'none', minInlineSize: 0},
});
