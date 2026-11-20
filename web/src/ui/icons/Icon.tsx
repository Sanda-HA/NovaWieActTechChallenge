import * as stylex from '@stylexjs/stylex';
import {Glyph} from './Glyph';
import type {IconName} from './paths';

export interface IconProps {
  name: IconName;
  size?: 16 | 20 | 24;
  /** Accessible name. Omit it for a decorative icon beside a visible label. */
  label?: string;
}

const styles = stylex.create({
  icon: {display: 'block', flexShrink: 0},
});

export function Icon({name, size = 20, label}: IconProps): React.JSX.Element {
  return <Glyph name={name} size={size} label={label} className={stylex.props(styles.icon).className} />;
}
