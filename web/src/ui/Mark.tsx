import * as stylex from '@stylexjs/stylex';
import {en} from '../theme/ednova.stylex';

export interface MarkProps {
  /** px, default 32 */
  size?: number;
  /** Accessible name, default "Nova"; "" when a visible name sits beside it. */
  label?: string;
  /** brand: the mark-ribbon and mark-turn tokens (follows Jour/Nuit). mono: currentColor. */
  tone?: 'brand' | 'mono';
}

// The Rise mark, from the supplied logo files: the folded ribbon N and its turned page.
const RIBBON =
  'M20 95 V31 C20 26.5 24.2 24.3 28 27.4 L76 68.2 V34.2 C76 31.4 77.7 29.1 80.2 27.8 L104 15.2 C108 13.1 112 15.5 112 20 V92.1 C112 95.8 110.2 98.8 107 100.5 L89.8 109.7 C86.1 111.7 83.5 111.2 80.3 108.4 L46 78.8 V111.7 C46 114 43.4 115.4 41.4 114.1 L25.1 104.1 C21.8 102.1 20 98.9 20 95 Z';
const TURN = 'M76 34.2 C76 31.4 77.7 29.1 80.2 27.8 L104 15.2 C108 13.1 112 15.5 112 20 V37.4 L76 56.5 Z';

const styles = stylex.create({
  svg: {display: 'block', flexShrink: 0, overflow: 'visible'},
  ribbon: {fill: en.markRibbon},
  mono: {fill: 'currentColor'},
  turn: {fill: en.markTurn},
});

export function Mark({size = 32, label = 'Nova', tone = 'brand'}: MarkProps): React.JSX.Element {
  const a11y = label ? {role: 'img', 'aria-label': label} : {'aria-hidden': true as const};
  return (
    <svg viewBox="13 11 106 106" width={size} height={size} {...a11y} {...stylex.props(styles.svg)}>
      <path d={RIBBON} {...stylex.props(tone === 'brand' ? styles.ribbon : styles.mono)} />
      {tone === 'brand' && <path d={TURN} {...stylex.props(styles.turn)} />}
    </svg>
  );
}
