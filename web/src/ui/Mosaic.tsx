import * as stylex from '@stylexjs/stylex';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useRef, useState, type KeyboardEvent, type Ref} from 'react';
import {en} from '../theme/ednova.stylex';
import type {MasteryLevel} from './MasteryTessera';

export type {MasteryLevel};
export type TesseraSize = 'small' | 'wide' | 'large';

export interface MosaicTile {
  id: string;
  /** Already translated. */
  label: string;
  level: MasteryLevel;
  /** small 1×1, wide 2×1, large 2×2 cells. Default small. */
  size?: TesseraSize;
}

export const MASTERY_WORDS: Record<MasteryLevel, MessageDescriptor> = {
  unknown: msg`Pas encore évalué`,
  weak: msg`Fragile`,
  medium: msg`En route`,
  strong: msg`Solide`,
};

export const MASTERY_LEVELS: readonly MasteryLevel[] = ['unknown', 'weak', 'medium', 'strong'];

/** Cells a tile covers, for weighting a share of the mosaic. */
export const TESSERA_AREA: Record<TesseraSize, number> = {small: 1, wide: 2, large: 4};

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const GLAZE_MS = 180;
const GLAZE_EASE = 'cubic-bezier(.2, .7, .2, 1)';

/**
 * The glaze: a tile settles into its bed while a sheen crosses it, in under 200 ms.
 * Nothing moves under reduced motion. Works on any element that holds a `[data-glaze]` child.
 */
export function glaze(tile: HTMLElement | null): void {
  if (!tile || typeof tile.animate !== 'function') return;
  if (window.matchMedia?.(REDUCED_MOTION).matches) return;
  tile.animate([{transform: 'scale(0.94)'}, {transform: 'scale(1)'}], {duration: GLAZE_MS, easing: GLAZE_EASE});
  const sheen = tile.querySelector<HTMLElement>('[data-glaze]');
  const from = getComputedStyle(tile).direction === 'rtl' ? '101%' : '-101%';
  const to = from === '101%' ? '-101%' : '101%';
  sheen?.animate([{transform: `translateX(${from})`}, {transform: `translateX(${to})`}], {duration: GLAZE_MS, easing: 'ease-out'});
}

const FILLED: Record<MasteryLevel, number> = {unknown: 0, weak: 1, medium: 2, strong: 4};
const CELLS = [
  [0, 7],
  [7, 7],
  [0, 0],
  [7, 0],
] as const;

const tone = stylex.create({
  unknown: {
    backgroundColor: `color-mix(in oklab, ${en.masteryUnknown} 18%, ${en.surface})`,
    // Raw clay: unglazed, with a faint stripe so it reads as "not yet" without colour.
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in oklab, ${en.masteryUnknown} 26%, transparent) 7px 8px)`,
    color: en.ink,
  },
  weak: {backgroundColor: en.masteryWeak, color: `light-dark(${en.ink}, ${en.ground})`},
  medium: {backgroundColor: en.masteryMedium, color: en.ground},
  strong: {backgroundColor: en.masteryStrong, color: en.ground},
});

// Columns follow the room the mosaic gets, not the window: beside a panel on a tablet it is as narrow as on a phone.
const MID = '@container (22rem <= width < 32rem)';
const NARROW = '@container (width < 22rem)';

const styles = stylex.create({
  frame: {containerType: 'inline-size', minInlineSize: 0},
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(var(--en-mosaic-columns, 6), minmax(0, 1fr))',
      [MID]: 'repeat(var(--en-mosaic-mid-columns, 4), minmax(0, 1fr))',
      [NARROW]: 'repeat(2, minmax(0, 1fr))',
    },
    gridAutoRows: {default: '5.5rem', '@media (width < 640px)': '4.25rem'},
    gridAutoFlow: 'row dense',
    gap: `calc(${en.grout} * 2)`,
    padding: `calc(${en.grout} * 2)`,
    margin: 0,
    borderRadius: en.radiusLg,
    // The grout: the bed the tiles are set in.
    backgroundColor: en.line,
    minInlineSize: 0,
  },
  columns: (count: number, mid: number) => ({'--en-mosaic-columns': count, '--en-mosaic-mid-columns': mid}),
  tile: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: en.space1,
    minInlineSize: 0,
    margin: 0,
    paddingBlock: en.space2,
    paddingInline: en.space2,
    overflow: 'hidden',
    borderRadius: en.radiusTessera,
    fontFamily: en.fontText,
    textAlign: 'start',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transitionProperty: 'box-shadow, filter',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    filter: {default: null, '@media (hover: hover)': {default: null, ':hover': 'brightness(1.07)'}},
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
    zIndex: {default: null, ':focus-visible': 1},
  },
  still: {cursor: 'default'},
  roomy: {paddingInline: en.space3},
  // An empty bed at the end of the last row, so the grout frame stays whole.
  // The end of a row is set with small plain chips, as a zellige floor fills its edges: grout lines split the cell in four.
  filler: {
    borderRadius: en.radiusTessera,
    backgroundColor: `color-mix(in oklab, ${en.masteryUnknown} 10%, ${en.ground})`,
    backgroundImage: `linear-gradient(90deg, transparent calc(50% - ${en.grout}), ${en.line} 0 calc(50% + ${en.grout}), transparent 0), linear-gradient(transparent calc(50% - ${en.grout}), ${en.line} 0 calc(50% + ${en.grout}), transparent 0)`,
  },
  wide: {gridColumn: 'span 2'},
  large: {gridColumn: 'span 2', gridRow: 'span 2'},
  selected: {boxShadow: `inset 0 0 0 2px ${en.ground}, inset 0 0 0 4px ${en.ink}`},
  name: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    overflow: 'hidden',
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
    fontWeight: 600,
    overflowWrap: 'anywhere',
    hyphens: 'auto',
    textWrap: 'pretty',
  },
  nameLarge: {
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    WebkitLineClamp: 2,
  },
  foot: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: en.space2, minInlineSize: 0},
  word: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
    opacity: 0.85,
  },
  glyph: {display: 'block', flexShrink: 0, marginInlineStart: 'auto'},
  cellFilled: {fill: 'currentColor'},
  cellEmpty: {fill: 'none', stroke: 'currentColor', strokeWidth: 1, opacity: 0.55},
  sheen: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'linear-gradient(100deg, transparent 25%, rgb(255 255 255 / 0.5) 50%, transparent 75%)',
    transform: 'translateX(-101%)',
  },
  legend: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `${en.space2} ${en.space4}`, margin: 0, padding: 0, listStyle: 'none'},
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
  },
  swatch: {
    display: 'block',
    inlineSize: 14,
    blockSize: 14,
    flexShrink: 0,
    borderRadius: en.radiusTessera,
    boxShadow: `0 0 0 1px ${en.line}`,
  },
});

/** The level as tesserae (0, 1, 2 or 4 set), drawn in the tile's own ink so it never relies on colour. */
function LevelGlyph({level}: {level: MasteryLevel}) {
  const filled = FILLED[level];
  return (
    <svg viewBox="0 0 13 13" width={13} height={13} aria-hidden="true" focusable="false" {...stylex.props(styles.glyph)}>
      {CELLS.map(([x, y], index) =>
        index < filled ? (
          <rect key={index} x={x} y={y} width={6} height={6} rx={1} {...stylex.props(styles.cellFilled)} />
        ) : (
          <rect key={index} x={x + 0.5} y={y + 0.5} width={5} height={5} rx={1} {...stylex.props(styles.cellEmpty)} />
        ),
      )}
    </svg>
  );
}

export interface TesseraProps {
  label: string;
  level: MasteryLevel;
  size?: TesseraSize;
  /** Shown as pressed; only meaningful inside a mosaic that keeps a selection. */
  selected?: boolean;
  /** Makes the tile a button. Without it the tile is an image with the same accessible name. */
  onClick?: () => void;
  tabIndex?: number;
  /** Plays the glaze once when the tile mounts (a tile just set). */
  glazeOnMount?: boolean;
  ref?: Ref<HTMLElement>;
  onFocus?: () => void;
}

/** One chapter tile. Its accessible name always says the mastery in words. */
export function Tessera({label, level, size = 'small', selected, onClick, tabIndex, glazeOnMount, ref, onFocus}: TesseraProps): React.JSX.Element {
  const {i18n} = useLingui();
  const own = useRef<HTMLElement | null>(null);
  const word = i18n._(MASTERY_WORDS[level]);
  const name = `${label}, ${word}`;

  useEffect(() => {
    if (glazeOnMount) glaze(own.current);
  }, [glazeOnMount]);

  const setRef = (node: HTMLElement | null) => {
    own.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as {current: HTMLElement | null}).current = node;
  };

  const className = stylex.props(
    styles.tile,
    tone[level],
    size === 'wide' && styles.wide,
    size === 'large' && styles.large,
    size !== 'small' && styles.roomy,
    selected && styles.selected,
    !onClick && styles.still,
  );
  const content = (
    <>
      <span aria-hidden="true" {...stylex.props(styles.name, size === 'large' && styles.nameLarge)}>
        {label}
      </span>
      <span aria-hidden="true" {...stylex.props(styles.foot)}>
        {size === 'large' && <span {...stylex.props(styles.word)}>{word}</span>}
        <LevelGlyph level={level} />
      </span>
      <span data-glaze="" aria-hidden="true" {...stylex.props(styles.sheen)} />
    </>
  );

  if (!onClick) {
    return (
      <div ref={setRef} role="img" aria-label={name} title={label} {...className}>
        {content}
      </div>
    );
  }
  return (
    <button
      ref={setRef}
      type="button"
      aria-label={name}
      aria-pressed={selected === undefined ? undefined : selected}
      title={label}
      tabIndex={tabIndex}
      onClick={onClick}
      onFocus={onFocus}
      {...className}>
      {content}
    </button>
  );
}

type Arrow = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
const ARROWS = new Set<string>(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/** Moves to the nearest tile that is visually in the arrow's direction; any packing, either direction. */
export function nearestTile(rects: readonly DOMRect[], from: number, key: Arrow, rtl = false): number {
  const current = rects[from];
  const flat = !current || rects.every(rect => rect.width === 0 && rect.height === 0);
  if (flat) {
    const forward = key === 'ArrowDown' || key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    return Math.min(rects.length - 1, Math.max(0, from + (forward ? 1 : -1)));
  }
  const cx = current.left + current.width / 2;
  const cy = current.top + current.height / 2;
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const sign = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
  let best = from;
  let bestScore = Infinity;
  rects.forEach((rect, index) => {
    if (index === from) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const primary = (horizontal ? x - cx : y - cy) * sign;
    if (primary <= 1) return;
    // A tile that shares the row (or column) wins over a closer one off to the side.
    const overlaps = horizontal
      ? rect.top < current.bottom - 1 && rect.bottom > current.top + 1
      : rect.left < current.right - 1 && rect.right > current.left + 1;
    const secondary = overlaps ? 0 : Math.abs(horizontal ? y - cy : x - cx);
    const score = primary + secondary * 3;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

/** Whether a filler cell shows, per column count: wide, mid, narrow. A row only needs them at its end. */
const show = (wide: boolean, mid: boolean, narrow: boolean) => ({
  display: {default: wide ? 'block' : 'none', [MID]: mid ? 'block' : 'none', [NARROW]: narrow ? 'block' : 'none'},
});
const fillerAt = stylex.create({
  f000: show(false, false, false),
  f001: show(false, false, true),
  f010: show(false, true, false),
  f011: show(false, true, true),
  f100: show(true, false, false),
  f101: show(true, false, true),
  f110: show(true, true, false),
  f111: show(true, true, true),
});
type FillerKey = keyof typeof fillerAt;

export interface MosaicProps {
  tiles: readonly MosaicTile[];
  /** Accessible name of the whole mosaic. */
  label: string;
  /** Columns above phone width; phones always get 2. Default 6. */
  columns?: number;
  /** Keeps a selection (tiles become pressed/not pressed). Omit for a map where a tile just opens. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Glazes this tile whenever `glazeKey` changes, e.g. after it was just set. */
  glazeId?: string | null;
  glazeKey?: number;
}

/**
 * Chapters set as tesserae in grout. One tab stop: arrows move between tiles by where they sit,
 * Home and End jump to the first and last, Enter or Space selects.
 */
export function Mosaic({tiles, label, columns = 6, selectedId, onSelect, glazeId, glazeKey}: MosaicProps): React.JSX.Element {
  const refs = useRef(new Map<string, HTMLElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const keeps = selectedId !== undefined;
  const fallback = tiles[0]?.id ?? null;
  const rovingId = tiles.some(tile => tile.id === focusId) ? focusId : tiles.some(tile => tile.id === selectedId) ? selectedId : fallback;

  useEffect(() => {
    if (glazeId && glazeKey) glaze(refs.current.get(glazeId) ?? null);
  }, [glazeId, glazeKey]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tiles.findIndex(tile => tile.id === rovingId);
    if (index < 0) return;
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tiles.length - 1;
    else if (ARROWS.has(event.key)) {
      const rects = tiles.map(tile => refs.current.get(tile.id)?.getBoundingClientRect() ?? new DOMRect());
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      next = nearestTile(rects, index, event.key as Arrow, rtl);
    } else return;
    event.preventDefault();
    const target = tiles[next];
    if (!target) return;
    setFocusId(target.id);
    refs.current.get(target.id)?.focus();
  };

  const area = tiles.reduce((sum, tile) => sum + TESSERA_AREA[tile.size ?? 'small'], 0);
  const fillers = (count: number) => (count - (area % count)) % count;
  const midColumns = Math.min(columns, 4);
  const fill = {wide: fillers(columns), mid: fillers(midColumns), narrow: fillers(2)};

  return (
    <div {...stylex.props(styles.frame)}>
    <div role="group" aria-label={label} onKeyDown={move} {...stylex.props(styles.grid, styles.columns(columns, midColumns))}>
      {tiles.map(tile => (
        <Tessera
          key={tile.id}
          ref={node => {
            if (node) refs.current.set(tile.id, node);
            else refs.current.delete(tile.id);
          }}
          label={tile.label}
          level={tile.level}
          size={tile.size}
          selected={keeps ? tile.id === selectedId : undefined}
          tabIndex={tile.id === rovingId ? 0 : -1}
          onFocus={() => setFocusId(tile.id)}
          onClick={() => {
            glaze(refs.current.get(tile.id) ?? null);
            onSelect?.(tile.id);
          }}
        />
      ))}
      {Array.from({length: Math.max(fill.wide, fill.mid, fill.narrow)}, (_, index) => (
        <span
          key={`filler-${index}`}
          aria-hidden="true"
          {...stylex.props(styles.filler, fillerAt[`f${+(index < fill.wide)}${+(index < fill.mid)}${+(index < fill.narrow)}` as FillerKey])}
        />
      ))}
    </div>
    </div>
  );
}

/** The four levels with their words, so a sighted learner can read the colours too. */
export function MosaicLegend(): React.JSX.Element {
  const {i18n, t} = useLingui();
  return (
    <ul aria-label={t`Légende`} {...stylex.props(styles.legend)}>
      {MASTERY_LEVELS.map(level => (
        <li key={level} {...stylex.props(styles.legendItem)}>
          <span aria-hidden="true" {...stylex.props(styles.swatch, tone[level])} />
          {i18n._(MASTERY_WORDS[level])}
        </li>
      ))}
    </ul>
  );
}
