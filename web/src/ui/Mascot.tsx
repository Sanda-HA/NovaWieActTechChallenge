import * as stylex from '@stylexjs/stylex';
import {useAnimator, useMediaQuery} from '@astryxdesign/core/hooks';
import {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {en} from '../theme/ednova.stylex';
import {
  MASCOT_ARM,
  MASCOT_BODY,
  MASCOT_DEFS,
  MASCOT_HEAD,
  MASCOT_STATES,
  MASCOT_VIEWBOX,
  MASCOT_ZZ,
  type MascotArt,
} from './mascot-art';

/**
 * What Nova is doing. `cheer`, `encourage` and `wave` play once, then she settles back to `idle`;
 * the others hold until the prop changes.
 */
export type MascotMood = 'idle' | 'calm' | 'thinking' | 'cheer' | 'encourage' | 'wave' | 'peek' | 'sleep';

export interface MascotProps {
  mood?: MascotMood;
  /** px, default 120 */
  size?: number;
  /** Accessible name; omit when decorative. */
  label?: string;
  /** A slow bob and swaying fronds while she waits (welcome and home). */
  breathe?: boolean;
  /** Blink every few seconds. Default true. */
  blink?: boolean;
}

const ART: Record<MascotMood, MascotArt> = {
  idle: 'welcoming',
  calm: 'calm',
  thinking: 'thinking',
  cheer: 'cheering',
  encourage: 'encouraging',
  wave: 'welcoming',
  peek: 'welcoming',
  sleep: 'calm',
};

const ONE_SHOT_MS: Partial<Record<MascotMood, number>> = {cheer: 2000, encourage: 1800, wave: 2200};
const PEEK_VISIBLE = 0.7;
const BLINK_EVERY_MS = [3000, 7000] as const;


const REDUCED = '(prefers-reduced-motion: reduce)';

/* StyleX keyframes: loops and sub-parts of the drawing, which the compositor animator cannot reach. */
const bob = stylex.keyframes({
  '0%, 100%': {transform: 'translateY(0)'},
  '50%': {transform: 'translateY(-7px)'},
});
const sway = stylex.keyframes({
  from: {transform: 'rotate(-3.5deg)'},
  to: {transform: 'rotate(3.5deg)'},
});
const pulse = stylex.keyframes({
  '0%, 100%': {transform: 'scale(1)'},
  '50%': {transform: 'scale(1.09)'},
});
const tilt = stylex.keyframes({
  from: {transform: 'rotate(-3deg)'},
  to: {transform: 'rotate(-5.5deg)'},
});
const lid = stylex.keyframes({
  '0%, 100%': {transform: 'scaleY(1)'},
  '45%, 55%': {transform: 'scaleY(0.08)'},
});
const wave = stylex.keyframes({
  '0%, 100%': {transform: 'rotate(0deg)'},
  '20%': {transform: 'rotate(-16deg)'},
  '40%': {transform: 'rotate(8deg)'},
  '60%': {transform: 'rotate(-14deg)'},
  '80%': {transform: 'rotate(6deg)'},
});
const float = stylex.keyframes({
  '0%, 100%': {opacity: 0.35, transform: 'translateY(18%)'},
  '50%': {opacity: 1, transform: 'translateY(-18%)'},
});
const burst = stylex.keyframes({
  '0%': {opacity: 0, transform: 'scale(.3) rotate(-25deg)'},
  '25%': {opacity: 1, transform: 'scale(1.18) rotate(6deg)'},
  '40%, 72%': {opacity: 1, transform: 'scale(1) rotate(0deg)'},
  '100%': {opacity: 0, transform: 'scale(.85) rotate(0deg)'},
});
const drift = stylex.keyframes({
  '0%': {opacity: 0, transform: 'translate(-6px, 8px) scale(.8)'},
  '30%': {opacity: 1},
  '100%': {opacity: 0, transform: 'translate(10px, -16px) scale(1.1)'},
});

const styles = stylex.create({
  frame: {display: 'block', position: 'relative', flexShrink: 0},
  clipped: {overflow: 'hidden'},
  body: {display: 'block', transformOrigin: '50% 80%'},
  svg: {display: 'block', overflow: 'visible'},
  part: {transformBox: 'fill-box'},
  fig: {
    animationName: {default: bob, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 12)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  swaying: {
    animationName: {default: sway, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 10)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    transformOrigin: '10% 75%',
  },
  swayingLater: {animationDelay: `calc(${en.dur3} * -5)`},
  pulsing: {
    animationName: {default: pulse, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 4)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    transformOrigin: '10% 75%',
  },
  head: {transformOrigin: '50% 100%'},
  tilted: {
    transform: 'rotate(-3deg)',
    animationName: {default: tilt, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 8)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  eye: {transformOrigin: '50% 50%'},
  blink: {
    animationName: {default: lid, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur1} * 1.6)`,
    animationTimingFunction: 'ease-in-out',
  },
  paw: {transformOrigin: '0% 80%'},
  waving: {
    animationName: {default: wave, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 3.5)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 2,
  },
  dot: {
    animationName: {default: float, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 4.4)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both',
    transformOrigin: 'center',
  },
  spark: {
    animationName: {default: burst, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 6)`,
    animationTimingFunction: en.ease,
    animationFillMode: 'both',
    transformOrigin: 'center',
  },
  z: {
    animationName: {default: drift, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: `calc(${en.dur3} * 9)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both',
  },
  delay1: {animationDelay: `calc(${en.dur1} * 0.7)`},
  delay2: {animationDelay: `calc(${en.dur1} * 1.4)`},
  delay3: {animationDelay: `calc(${en.dur1} * 2)`},
  delay4: {animationDelay: `calc(${en.dur1} * 2)`},
  delay5: {animationDelay: `calc(${en.dur3} * 3)`},
  delay6: {animationDelay: `calc(${en.dur3} * 6)`},
});

const className = (...xs: ReadonlyArray<stylex.StyleXStyles | false>): string =>
  stylex.props(...xs.filter((x): x is stylex.StyleXStyles => x !== false)).className ?? '';

const DOT_CLASSES = [className(styles.dot), className(styles.dot, styles.delay3), className(styles.dot, styles.delay5)];
const SPARK_CLASSES = [
  className(styles.spark),
  className(styles.spark, styles.delay1),
  className(styles.spark, styles.delay2),
  className(styles.spark, styles.delay4),
];
const Z_CLASSES = [className(styles.z), className(styles.z, styles.delay5), className(styles.z, styles.delay6)];
const EYE_CLASS = className(styles.part, styles.eye);
const BLINK_CLASSES = className(styles.blink).split(' ');

interface Looks {
  fig: string;
  fronds: [string, string];
  head: string;
  paws: string;
}

/** Swaps the art's marker classes for StyleX animation classes, keeping the old stagger. */
function dress(markup: string, looks: Looks): string {
  const counters = {dot: 0, spark: 0, z: 0, frond: 0};
  return markup
    .replace(/class="en-nova__dot"/g, () => `class="${DOT_CLASSES[counters.dot++] ?? ''}"`)
    .replace(/class="en-nova__spark"/g, () => `class="${SPARK_CLASSES[counters.spark++] ?? ''}"`)
    .replace(/class="en-nova__z"/g, () => `class="${Z_CLASSES[counters.z++] ?? ''}"`)
    .replace(/class="en-nova__frond"/g, () => `class="${looks.fronds[counters.frond++ % 2]}"`)
    .replace(/class="en-nova__eye"/g, `class="${EYE_CLASS}" data-nova-eye=""`)
    .replace(/class="en-nova__fig"/, `class="${looks.fig}"`)
    .replace(/class="en-nova__head"/, `class="${looks.head}"`)
    .replace(/class="en-nova__paws"/, `class="${looks.paws}"`);
}

function looksFor(mood: MascotMood, breathe: boolean): Looks {
  const sway = breathe || mood === 'sleep';
  const frond = (later: boolean) =>
    className(
      styles.part,
      mood === 'thinking' ? styles.pulsing : sway && styles.swaying,
      mood !== 'thinking' && sway && later && styles.swayingLater,
    );
  return {
    fig: className(styles.part, (breathe || mood === 'sleep') && styles.fig),
    fronds: [frond(false), frond(true)],
    head: className(styles.part, styles.head, mood === 'thinking' && styles.tilted),
    paws: className(styles.part, styles.paw, mood === 'wave' && styles.waving),
  };
}

/** Nova the axolotl. The artwork is static and trusted, so it is set as markup. Decorative unless given a label. */
export function Mascot({mood = 'idle', size = 120, label, breathe = false, blink = true}: MascotProps): React.JSX.Element {
  const prefix = `en-nova${useId().replace(/[^a-zA-Z0-9]/g, '')}-`;
  const reduced = useMediaQuery(REDUCED);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animator = useAnimator(bodyRef);

  const [finished, setFinished] = useState<MascotMood | null>(null);
  useEffect(() => {
    setFinished(null);
    const ms = ONE_SHOT_MS[mood];
    if (ms === undefined) return;
    const timer = setTimeout(() => setFinished(mood), ms);
    return () => clearTimeout(timer);
  }, [mood]);
  const active: MascotMood = finished === mood ? 'idle' : mood;
  const art = ART[active];

  const markup = useMemo(() => {
    const parts = MASCOT_STATES[art];
    const extra = active === 'sleep' ? MASCOT_ZZ : parts.extra;
    const inner =
      MASCOT_DEFS +
      '<g class="en-nova__fig">' +
      MASCOT_BODY +
      (parts.arm ? MASCOT_ARM : '') +
      '<g class="en-nova__head">' +
      MASCOT_HEAD +
      parts.face +
      '</g><g class="en-nova__paws">' +
      parts.paws +
      '</g></g>' +
      extra;
    return dress(`<g transform="translate(96 100)">${inner}</g>`, looksFor(active, breathe)).split('~').join(prefix);
  }, [art, active, breathe, prefix]);

  const previous = useRef<MascotMood | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = active;
    const rest = {x: 0, y: 0, rotate: 0, scale: 1, opacity: 1};
    if (reduced) {
      animator.set(rest);
      return;
    }
    let live = true;
    const play = async () => {
      if (active === 'peek') {
        animator.set({y: size * PEEK_VISIBLE, opacity: 0});
        await animator.animate({y: 0, opacity: 1}, {velocity: {y: -size * 3}});
      } else if (active === 'cheer') {
        for (let hop = 0; hop < 2 && live; hop += 1) {
          await animator.animate({y: -size * 0.09, scale: 1.03});
          if (live) await animator.animate({y: 0, scale: 1});
        }
      } else if (active === 'encourage') {
        for (let nod = 0; nod < 2 && live; nod += 1) {
          await animator.animate({y: size * 0.03, rotate: 3});
          if (live) await animator.animate({y: 0, rotate: 0});
        }
      } else if (active === 'sleep') {
        await animator.animate({y: size * 0.025, rotate: -2.5});
      } else if (before === 'sleep') {
        await animator.animate({y: -size * 0.05, scale: 1.04, rotate: 0});
        if (live) await animator.animate({y: 0, scale: 1});
      } else if (before !== null && before !== active) {
        await animator.animate(rest);
      }
    };
    void play();
    return () => {
      live = false;
      animator.stop();
    };
  }, [active, animator, reduced, size]);

  const blinks = blink && !reduced && art !== 'cheering' && art !== 'calm';
  useEffect(() => {
    if (!blinks) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const [min, max] = BLINK_EVERY_MS;
      timer = setTimeout(() => {
        svgRef.current?.querySelectorAll('[data-nova-eye]').forEach(eye => {
          eye.classList.add(...BLINK_CLASSES);
          eye.addEventListener('animationend', () => eye.classList.remove(...BLINK_CLASSES), {once: true});
        });
        next();
      }, min + Math.random() * (max - min));
    };
    next();
    return () => clearTimeout(timer);
  }, [blinks, markup]);

  const peeking = active === 'peek';
  const a11y = label ? {role: 'img', 'aria-label': label} : {'aria-hidden': true as const};
  return (
    <span
      data-mood={active}
      {...stylex.props(styles.frame, peeking && styles.clipped)}
      style={{inlineSize: size, blockSize: peeking ? size * PEEK_VISIBLE : size}}
    >
      <span ref={bodyRef} {...stylex.props(styles.body)}>
        <svg
          ref={svgRef}
          viewBox={MASCOT_VIEWBOX}
          width={size}
          height={size}
          {...a11y}
          {...stylex.props(styles.svg)}
          dangerouslySetInnerHTML={{__html: markup}}
        />
      </span>
    </span>
  );
}
