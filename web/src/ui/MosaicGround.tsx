import * as stylex from '@stylexjs/stylex';
import {en} from '../theme/ednova.stylex';

// One 4×4 block of cells, read [column, row, width, height]: two large tiles, two bars, four small ones.
// Every cell is covered once, so the 2px grout runs unbroken across block edges.
const CELL = 40;
const TILES: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 2, 2],
  [2, 0, 1, 1],
  [3, 0, 1, 1],
  [2, 1, 2, 1],
  [0, 2, 1, 2],
  [1, 2, 1, 1],
  [1, 3, 1, 1],
  [2, 2, 2, 2],
];
const PATTERN_ID = 'en-mosaic-ground';

const styles = stylex.create({
  ground: {
    position: 'fixed',
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: '100%',
    blockSize: 'min(100dvh, 36rem)',
    zIndex: -1,
    pointerEvents: 'none',
    // The texture sits at the top of the page and is gone before the reading area.
    maskImage: 'linear-gradient(to bottom, rgb(0 0 0 / 0.38), transparent 75%)',
  },
  grout: {fill: en.line},
  tile: {fill: en.ground},
});

/** The page ground: tesserae set in grout, fading out under the content. Decorative. */
export function MosaicGround(): React.JSX.Element {
  const size = CELL * 4;
  return (
    <svg aria-hidden="true" focusable="false" {...stylex.props(styles.ground)}>
      <defs>
        <pattern id={PATTERN_ID} width={size} height={size} patternUnits="userSpaceOnUse">
          <rect width={size} height={size} {...stylex.props(styles.grout)} />
          {TILES.map(([column, row, width, height]) => (
            <rect
              key={`${column}-${row}`}
              x={column * CELL + 1}
              y={row * CELL + 1}
              width={width * CELL - 2}
              height={height * CELL - 2}
              rx={3}
              {...stylex.props(styles.tile)}
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${PATTERN_ID})`} />
    </svg>
  );
}
