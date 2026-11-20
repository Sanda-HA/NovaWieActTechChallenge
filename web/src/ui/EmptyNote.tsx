import * as stylex from '@stylexjs/stylex';
import type {ReactNode} from 'react';
import {en} from '../theme/ednova.stylex';
import {Mascot} from './Mascot';

const styles = stylex.create({
  note: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  text: {minInlineSize: 0, flex: '1 1 auto'},
});

/** An empty list's own sentence, with Nova peeking up beside it. The sentence stays the message. */
export function EmptyNote({children, size = 56}: {children: ReactNode; size?: number}): React.JSX.Element {
  return (
    <div {...stylex.props(styles.note)}>
      <Mascot mood="peek" size={size} />
      <div {...stylex.props(styles.text)}>{children}</div>
    </div>
  );
}
