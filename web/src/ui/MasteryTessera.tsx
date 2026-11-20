import * as stylex from '@stylexjs/stylex';
import {en} from '../theme/ednova.stylex';

export type MasteryLevel = 'unknown' | 'weak' | 'medium' | 'strong';

export interface MasteryTesseraProps {
  level: MasteryLevel;
  /** px, default 24 */
  size?: number;
  /** Defaults to the French level word; "" when a visible label sits beside it. */
  label?: string;
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  unknown: 'Pas encore évalué',
  weak: 'Fragile',
  medium: 'En route',
  strong: 'Solide',
};

const FILLED: Record<MasteryLevel, number> = {unknown: 0, weak: 1, medium: 2, strong: 4};
/** Bottom row first, so the mosaic builds up from the ground. */
const CELLS = [
  [2, 13],
  [13, 13],
  [2, 2],
  [13, 2],
] as const;

const styles = stylex.create({
  svg: {display: 'block', flexShrink: 0, overflow: 'visible'},
  empty: {fill: 'none', stroke: en.masteryUnknown, strokeWidth: 1.5},
  dashed: {strokeDasharray: '2 2'},
  weak: {fill: en.masteryWeak},
  medium: {fill: en.masteryMedium},
  strong: {fill: en.masteryStrong},
});

/** Four tesserae: 0, 1, 2 or 4 filled. Always shown with a word, never by colour alone. */
export function MasteryTessera({level, size = 24, label}: MasteryTesseraProps): React.JSX.Element {
  const name = label ?? MASTERY_LABEL[level];
  const a11y = name ? {role: 'img', 'aria-label': name} : {'aria-hidden': true as const};
  const filled = FILLED[level];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...a11y} {...stylex.props(styles.svg)}>
      {CELLS.map(([x, y], index) =>
        index < filled && level !== 'unknown' ? (
          <rect key={index} x={x} y={y} width={9} height={9} rx={2} data-filled="true" {...stylex.props(styles[level])} />
        ) : (
          <rect
            key={index}
            x={x + 0.75}
            y={y + 0.75}
            width={7.5}
            height={7.5}
            rx={1.6}
            {...stylex.props(styles.empty, level === 'unknown' && styles.dashed)}
          />
        ),
      )}
    </svg>
  );
}
