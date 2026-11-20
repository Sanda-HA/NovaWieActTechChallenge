import * as stylex from '@stylexjs/stylex';
import {Heading} from '@astryxdesign/core/Heading';
import type {ReactNode} from 'react';
import {en} from '../../theme/ednova.stylex';

const styles = stylex.create({
  group: {display: 'grid', gap: en.space3, minInlineSize: 0},
  head: {display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: en.space3},
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: 600,
  },
});

/** A titled block of a step. */
export function Group({title, aside, children}: {title: string; aside?: ReactNode; children: ReactNode}): React.JSX.Element {
  return (
    <section {...stylex.props(styles.group)}>
      <div {...stylex.props(styles.head)}>
        <Heading level={2} xstyle={styles.title}>
          {title}
        </Heading>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const choiceGrid = stylex.create({
  three: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(3, minmax(0, 1fr))'},
    gap: en.space3,
  },
  two: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(2, minmax(0, 1fr))'},
    gap: en.space3,
  },
  note: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});
