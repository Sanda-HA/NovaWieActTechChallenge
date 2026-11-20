import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useRef, type ReactNode} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Directional} from '../../ui/Directional';
import {Icon} from '../../ui/icons';
import {Mascot, type MascotMood} from '../../ui/Mascot';

const styles = stylex.create({
  frame: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 1024px)': 'minmax(300px, 400px) minmax(0, 1fr)'},
    alignItems: 'start',
    gap: {default: en.space6, '@media (width >= 1024px)': en.space12},
    inlineSize: '100%',
    minInlineSize: 0,
  },
  aside: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'center',
    gap: en.space4,
    minInlineSize: 0,
  },
  withMascot: {
    gridTemplateColumns: {default: 'minmax(0, 1fr) auto', '@media (width >= 1024px)': 'minmax(0, 1fr)'},
    gap: {default: en.space2, '@media (width >= 360px)': en.space4},
  },
  bubble: {
    minInlineSize: 0,
    padding: {default: en.space4, '@media (width >= 640px)': en.space6},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  title: {
    margin: 0,
    overflowWrap: 'anywhere',
    textWrap: 'balance',
    fontFamily: en.fontDisplay,
    fontSize: {default: '1.625rem', '@media (width >= 1024px)': '2.125rem'},
    lineHeight: {default: '2rem', '@media (width >= 1024px)': '2.5rem'},
    fontWeight: 700,
    color: en.ink,
    outline: '0 none',
  },
  sub: {
    margin: 0,
    marginBlockStart: en.space3,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
  },
  nova: {
    justifySelf: {default: 'end', '@media (width >= 1024px)': 'start'},
    paddingInlineStart: {default: 0, '@media (width >= 1024px)': en.space6},
  },
  section: {display: 'grid', alignContent: 'start', gap: en.space6, minInlineSize: 0},
  actions: {display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: en.space3},
  actionsEnd: {display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: en.space3, marginInlineStart: 'auto'},
});

export interface StepFrameProps {
  title: string;
  sub?: string;
  mascot?: MascotMood;
  children: ReactNode;
  /** Changes when the screen inside the step changes, so the title takes focus again. */
  focusKey?: string;
}

/** Every step but the welcome: Nova says what this step is, and the step's own content sits beside her. */
export function StepFrame({title, sub, mascot, children, focusKey}: StepFrameProps): React.JSX.Element {
  const heading = useRef<HTMLHeadingElement>(null);
  const wide = useMediaQuery('(width >= 1024px)');
  const narrow = useMediaQuery('(width < 360px)');
  useEffect(() => heading.current?.focus({preventScroll: true}), [focusKey]);
  return (
    <div {...stylex.props(styles.frame)}>
      <aside {...stylex.props(styles.aside, mascot && styles.withMascot)}>
        <div {...stylex.props(styles.bubble)}>
          <Heading ref={heading} id="step-title" level={1} tabIndex={-1} xstyle={styles.title}>
            {title}
          </Heading>
          {sub && <p {...stylex.props(styles.sub)}>{sub}</p>}
        </div>
        {mascot && (
          <div {...stylex.props(styles.nova)}>
            <Mascot mood={mascot} size={wide ? 176 : narrow ? 60 : 88} />
          </div>
        )}
      </aside>
      <section aria-labelledby="step-title" {...stylex.props(styles.section)}>
        {children}
      </section>
    </div>
  );
}

/** Retour on one side, the step's own actions on the other. */
export function StepActions({onBack, children}: {onBack?: () => void; children?: ReactNode}): React.JSX.Element {
  const {t} = useLingui();
  return (
    <div {...stylex.props(styles.actions)}>
      {onBack && (
        <Button
          variant="ghost"
          label={t`Retour`}
          icon={
            <Directional>
              <Icon name="chevron-left" size={20} />
            </Directional>
          }
          onClick={onBack}
        />
      )}
      <div {...stylex.props(styles.actionsEnd)}>{children}</div>
    </div>
  );
}

/** The forward arrow on a primary action. */
export function NextArrow(): React.JSX.Element {
  return (
    <Directional>
      <Icon name="arrow-right" size={20} />
    </Directional>
  );
}
