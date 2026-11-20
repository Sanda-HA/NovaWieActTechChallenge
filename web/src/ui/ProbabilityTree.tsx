import * as stylex from '@stylexjs/stylex';
import {useLingui} from '@lingui/react/macro';
import {en} from '../theme/ednova.stylex';
import {MathText} from './MathText';

const WIDTH = 360;
const HEIGHT = 200;
const ROOT = {x: 18, y: 100};
const A = {x: 150, y: 52, tex: 'A'};
const NOT_A = {x: 150, y: 148, tex: String.raw`\overline{A}`};
const LEAVES = [
  {x: 306, y: 22, tex: 'B'},
  {x: 306, y: 82, tex: String.raw`\overline{B}`},
  {x: 306, y: 118, tex: 'B'},
  {x: 306, y: 178, tex: String.raw`\overline{B}`},
] as const;
const EDGES = [
  {from: ROOT, to: A, p: '0{,}4', hot: true},
  {from: ROOT, to: NOT_A, p: '0{,}6', hot: false},
  {from: A, to: LEAVES[0], p: '0{,}25', hot: true},
  {from: A, to: LEAVES[1], p: '0{,}75', hot: false},
  {from: NOT_A, to: LEAVES[2], p: '0{,}5', hot: false},
  {from: NOT_A, to: LEAVES[3], p: '0{,}5', hot: false},
];

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

const styles = stylex.create({
  frame: {position: 'relative', inlineSize: '100%', marginInline: 'auto', aspectRatio: `${WIDTH} / ${HEIGHT}`},
  svg: {position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%'},
  hot: {stroke: en.argile, strokeWidth: 3, strokeLinecap: 'round'},
  cold: {stroke: en.lineStrong, strokeWidth: 1.75, strokeLinecap: 'round'},
  root: {fill: en.ink},
  label: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    color: en.ink,
    fontFamily: en.fontMath,
    fontSize: '0.9375rem',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  probability: {fontSize: '0.75rem', color: en.inkMuted},
  probabilityHot: {fontSize: '0.75rem', color: en.argileStrong, fontWeight: 600},
});

/**
 * The worked example's tree, A with 0,4 then B with 0,25. A diagram is drawn in one fixed direction,
 * so its frame stays `ltr` inside right-to-left pages.
 */
export function ProbabilityTree({small = false}: {small?: boolean}): React.JSX.Element {
  const {t} = useLingui();
  const place = (x: number, y: number) => ({insetInlineStart: pct(x, WIDTH), insetBlockStart: pct(y, HEIGHT)});
  return (
    <div
      dir="ltr"
      role="img"
      aria-label={t`Arbre de probabilités : A avec 0,4 puis B avec 0,25 ; non A avec 0,6 puis B avec 0,5.`}
      style={{maxInlineSize: small ? 220 : 420}}
      {...stylex.props(styles.frame)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false" {...stylex.props(styles.svg)}>
        {EDGES.map(edge => (
          <line
            key={`${edge.to.x}-${edge.to.y}`}
            x1={edge.from.x + 8}
            y1={edge.from.y}
            x2={edge.to.x - 14}
            y2={edge.to.y}
            {...stylex.props(edge.hot ? styles.hot : styles.cold)}
          />
        ))}
        <circle cx={ROOT.x} cy={ROOT.y} r={5} {...stylex.props(styles.root)} />
      </svg>
      {!small && (
        <div aria-hidden="true">
          {[A, NOT_A, ...LEAVES].map(node => (
            <span key={`${node.x}-${node.y}`} style={place(node.x, node.y)} {...stylex.props(styles.label)}>
              <MathText text={`$${node.tex}$`} />
            </span>
          ))}
          {EDGES.map(edge => (
            <span
              key={`p-${edge.to.x}-${edge.to.y}`}
              style={place((edge.from.x + edge.to.x) / 2, (edge.from.y + edge.to.y) / 2 - 11)}
              {...stylex.props(styles.label, edge.hot ? styles.probabilityHot : styles.probability)}>
              <MathText text={`$${edge.p}$`} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
