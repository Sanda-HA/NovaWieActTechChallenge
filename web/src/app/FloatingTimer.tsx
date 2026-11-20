import * as stylex from '@stylexjs/stylex';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Button} from '@astryxdesign/core/Button';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Popover} from '@astryxdesign/core/Popover';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {useServerText} from '../i18n/serverText';
import {PHASE_WORDS, TimerControls, clock, useRemaining} from '../screens/seances/TimerControls';
import {en} from '../theme/ednova.stylex';
import {Directional} from '../ui/Directional';
import {Icon} from '../ui/icons';
import {breakMs} from '../lib/study-timer';
import {useSession, useStore} from './session';

const PHONE = '(width < 640px)';
const FIELD = 'input:not([type=button], [type=checkbox], [type=radio], [type=range]), textarea, select, [contenteditable=""], [contenteditable="true"]';
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const styles = stylex.create({
  toggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: en.space2,
    minBlockSize: en.sizeTouch,
    paddingBlock: 0,
    paddingInlineStart: en.space1,
    paddingInlineEnd: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {default: en.line, '@media (hover: hover)': {default: en.line, ':hover': en.lineStrong}},
    borderRadius: en.radiusFull,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
  ring: {display: 'block', flexShrink: 0, inlineSize: 32, blockSize: 32, transform: 'rotate(-90deg)'},
  track: {fill: 'none', stroke: en.line, strokeWidth: 5},
  progress: {
    fill: 'none',
    stroke: en.faience,
    strokeWidth: 5,
    strokeLinecap: 'round',
    transitionProperty: 'stroke-dashoffset',
    transitionDuration: {default: '1s', '@media (prefers-reduced-motion: reduce)': '0s'},
    transitionTimingFunction: 'linear',
  },
  paused: {stroke: en.ocre},
  done: {stroke: en.masteryStrong},
  rest: {stroke: en.inkMuted},
  chip: {
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  panel: {display: 'grid', gap: en.space4, minInlineSize: 0, inlineSize: '100%'},
  group: {display: 'grid', gap: en.space3, minInlineSize: 0},
  link: {justifySelf: 'start'},
  live: {
    position: 'absolute',
    inlineSize: 1,
    blockSize: 1,
    margin: -1,
    padding: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

interface ToggleProps {
  ref?: (element: HTMLElement | null) => void;
  onClick: () => void;
  'aria-haspopup'?: 'dialog';
  'aria-expanded': boolean;
  'aria-controls'?: string;
}

/**
 * The study timer on every app screen: a ring and a clock that open its controls.
 * Desktop: an anchored Popover. Phone: a BottomSheet without a scrim, so the page stays usable: a press outside
 * closes it, and so does focusing another field, before the phone keyboard pushes the sheet over that field.
 * Both render in the browser's top layer, outside the screen's transform and stacking context, so they stay put
 * while a route transition runs.
 */
export function FloatingTimer(): React.JSX.Element {
  const {timer} = useSession();
  const state = useStore(timer);
  const remaining = useRemaining(timer, state.phase);
  const phone = useMediaQuery(PHONE);
  const navigate = useNavigate();
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const [open, setOpen] = useState(false);
  const sheetTrigger = useRef<HTMLElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!phone || !open) return;
    const outside = (target: EventTarget | null) =>
      target instanceof Node && !sheet.current?.contains(target) && !sheetTrigger.current?.contains(target);
    const onPointerDown = (event: PointerEvent) => {
      if (outside(event.target)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (outside(event.target) && event.target instanceof Element && event.target.matches(FIELD)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [phone, open]);

  const {phase, durationMs} = state;
  const total = phase === 'break' ? breakMs : durationMs;
  const progress = total ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const word = i18n._(PHASE_WORDS[phase]).toLocaleLowerCase(i18n.locale);

  const toggle = (trigger: ToggleProps) => (
    <button
      ref={trigger.ref}
      type="button"
      onClick={trigger.onClick}
      aria-haspopup={trigger['aria-haspopup']}
      aria-expanded={trigger['aria-expanded']}
      aria-controls={trigger['aria-controls']}
      aria-label={t`Minuteur d’étude : ${word}`}
      {...stylex.props(styles.toggle)}>
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...stylex.props(styles.ring)}>
        <circle cx={24} cy={24} r={RADIUS} {...stylex.props(styles.track)} />
        <circle
          cx={24}
          cy={24}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          {...stylex.props(styles.progress, phase === 'paused' && styles.paused, phase === 'done' && styles.done, phase === 'break' && styles.rest)}
        />
      </svg>
      <span aria-hidden="true" translate="no" {...stylex.props(styles.chip)}>
        {clock(remaining)}
      </span>
    </button>
  );

  const panel = (
    <div role="group" aria-label={t`Commandes du minuteur`} {...stylex.props(styles.panel)}>
      <TimerControls />
      <Button
        variant="secondary"
        size="sm"
        label={t`Voir mon temps d’étude`}
        endContent={
          <Directional>
            <Icon name="arrow-right" size={20} />
          </Directional>
        }
        onClick={() => {
          setOpen(false);
          void navigate('/seances');
        }}
        xstyle={styles.link}
      />
    </div>
  );

  return (
    <>
      {phone ? (
        <>
          {toggle({
            ref: element => {
              sheetTrigger.current = element;
            },
            onClick: () => setOpen(value => !value),
            'aria-haspopup': 'dialog',
            'aria-expanded': open,
          })}
          <BottomSheet
            ref={sheet}
            isOpen={open}
            onOpenChange={setOpen}
            hasScrim={false}
            label={t`Minuteur d’étude`}
            height="hug"
            padding={4}>
            {panel}
          </BottomSheet>
        </>
      ) : (
        <Popover
          isOpen={open}
          onOpenChange={setOpen}
          label={t`Minuteur d’étude`}
          placement="below"
          alignment="end"
          width="22rem"
          padding={4}
          content={panel}>
          {trigger => toggle({...trigger, onClick: () => trigger.onClick()})}
        </Popover>
      )}
      <p aria-live="polite" {...stylex.props(styles.live)}>
        {serverText(state.announcement)}
      </p>
    </>
  );
}
