import * as stylex from '@stylexjs/stylex';
import type {ReactNode} from 'react';

const styles = stylex.create({
  flip: {display: 'inline-flex', transform: {default: null, ':dir(rtl)': 'scaleX(-1)'}},
});

/** Mirrors an arrow or chevron in right-to-left pages, so "next" always points the way the text goes. */
export function Directional({children}: {children: ReactNode}): React.JSX.Element {
  return <span {...stylex.props(styles.flip)}>{children}</span>;
}
