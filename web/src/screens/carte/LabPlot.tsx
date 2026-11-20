import * as stylex from '@stylexjs/stylex';
import {useLingui} from '@lingui/react/macro';
import {useId, type PointerEvent} from 'react';
import {en} from '../../theme/ednova.stylex';
import {MathText} from '../../ui/MathText';

type Point = [number, number];
type Bounds = [number, number, number, number];

interface LabSeries {
  label: string;
  style: 'line' | 'dashed' | 'points' | 'bars' | 'area';
  paths: Point[][];
}

interface LabFrame {
  value: number;
  answer: number;
  feedback: string;
  series: LabSeries[];
}

export interface PlotActivity {
  topic: string;
  title: string;
  instruction: string;
  parameter: string;
  bounds: Bounds;
  frames: LabFrame[];
  equal_axes: boolean;
}

const WIDTH = 432;
const HEIGHT = 272;
const PAD_X = 46;
const PAD_Y = 30;

const styles = stylex.create({
  graph: {display: 'block', direction: 'ltr', inlineSize: '100%', maxInlineSize: 600, backgroundColor: en.surfaceSunken, borderRadius: en.radiusMd},
  grid: {stroke: en.line, strokeWidth: 1},
  axis: {stroke: en.lineStrong, strokeWidth: 1.5},
  tick: {fill: en.inkMuted, fontFamily: en.fontText, fontSize: '12px'},
  series0: {color: en.faience},
  series1: {color: en.argileStrong},
  series2: {color: en.ocreInk},
  series3: {color: en.ink},
  line: {stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round', fill: 'none'},
  dashed: {strokeDasharray: '5 4'},
  dots: {fill: 'currentColor'},
  bars: {fill: 'currentColor', fillOpacity: 0.65},
  area: {fill: 'currentColor', fillOpacity: 0.25},
  handle: {fill: 'transparent', cursor: 'grab', touchAction: 'none'},
  legend: {display: 'flex', flexWrap: 'wrap', gap: `${en.space1} ${en.space4}`, listStyle: 'none', margin: 0, padding: 0},
  legendItem: {display: 'flex', alignItems: 'center', gap: en.space2, fontSize: en.typeCaptionSize, overflowWrap: 'anywhere'},
  key: {inlineSize: '1rem', flexShrink: 0, borderBlockStartWidth: 2, borderBlockStartStyle: 'solid', borderBlockStartColor: 'currentColor'},
  dashedKey: {borderBlockStartStyle: 'dashed'},
  pointKey: {borderBlockStartStyle: 'dotted'},
  filledKey: {blockSize: '0.55rem', borderBlockStartWidth: 0, backgroundColor: 'currentColor', opacity: 0.6},
});

const seriesColors = [styles.series0, styles.series1, styles.series2, styles.series3];

export function projection([xmin, xmax, ymin, ymax]: Bounds, equalAxes = false) {
  const xScale = (WIDTH - PAD_X * 2) / (xmax - xmin);
  const yScale = (HEIGHT - PAD_Y * 2) / (ymax - ymin);
  const sx = equalAxes ? Math.min(xScale, yScale) : xScale;
  const sy = equalAxes ? Math.min(xScale, yScale) : yScale;
  const centerX = (xmin + xmax) / 2;
  const centerY = (ymin + ymax) / 2;
  return {
    x: (value: number) => WIDTH / 2 + (value - centerX) * sx,
    y: (value: number) => HEIGHT / 2 - (value - centerY) * sy,
    readX: (pixel: number) => (pixel - WIDTH / 2) / sx + centerX,
  };
}

export function closestFrame(frames: readonly {value: number}[], value: number) {
  return frames.reduce((closest, frame, index) =>
    Math.abs(frame.value - value) < Math.abs(frames[closest]!.value - value) ? index : closest, 0);
}

const ticks = (min: number, max: number) => Array.from({length: 5}, (_, index) => min + (max - min) * index / 4);

interface PlotProps {
  activity: PlotActivity;
  frame: LabFrame;
  onSelect: (index: number) => void;
  format: (value: number) => string;
}

export function LabPlot({activity, frame, onSelect, format}: PlotProps): React.JSX.Element {
  const {t} = useLingui();
  const clip = useId();
  const [xmin, xmax, ymin, ymax] = activity.bounds;
  const {x, y, readX} = projection(activity.bounds, activity.equal_axes);
  const x0 = x(Math.min(xmax, Math.max(xmin, 0)));
  const y0 = y(Math.min(ymax, Math.max(ymin, 0)));
  const handle = activity.topic === 'derivabilite'
    ? frame.series.find(series => series.style === 'points')?.paths[0]?.[0]
    : undefined;

  function drag(event: PointerEvent<SVGCircleElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onSelect(closestFrame(activity.frames, readX(position.x)));
  }

  function seriesSegment(series: LabSeries, points: Point[], index: number) {
    if (series.style === 'points') {
      return <g key={index}>{points.map(([a, b], i) => <circle key={i} cx={x(a)} cy={y(b)} r={4} {...stylex.props(styles.dots)} />)}</g>;
    }
    if (series.style === 'bars') {
      const spacing = points.length > 1
        ? Math.min(...points.slice(1).map(([a], i) => Math.abs(x(a) - x(points[i]![0]))))
        : 34;
      const width = Math.max(3, Math.min(24, spacing * 0.58));
      return <g key={index}>{points.map(([a, b], i) => (
        <rect key={i} x={x(a) - width / 2} y={Math.min(y0, y(b))} width={width} height={Math.abs(y(b) - y0)} rx={2} {...stylex.props(styles.bars)} />
      ))}</g>;
    }
    const path = points.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a)} ${y(b)}`).join(' ');
    return <path key={index} d={series.style === 'area' ? `${path} Z` : path}
      {...stylex.props(series.style === 'area' ? styles.area : styles.line, series.style === 'dashed' && styles.dashed)} />;
  }

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" {...stylex.props(styles.graph)}>
        <defs><clipPath id={clip}><rect x={x(xmin)} y={y(ymax)} width={x(xmax) - x(xmin)} height={y(ymin) - y(ymax)} /></clipPath></defs>
        {ticks(xmin, xmax).map(value => (
          <g key={value}>
            <line x1={x(value)} x2={x(value)} y1={y(ymax)} y2={y(ymin)} {...stylex.props(styles.grid)} />
            <text x={x(value)} y={y(ymin) + 18} textAnchor="middle" {...stylex.props(styles.tick)}>{format(value)}</text>
          </g>
        ))}
        {ticks(ymin, ymax).map(value => (
          <g key={value}>
            <line x1={x(xmin)} x2={x(xmax)} y1={y(value)} y2={y(value)} {...stylex.props(styles.grid)} />
            <text x={x(xmin) - 9} y={y(value) + 4} textAnchor="end" {...stylex.props(styles.tick)}>{format(value)}</text>
          </g>
        ))}
        <line x1={x(xmin)} x2={x(xmax)} y1={y0} y2={y0} {...stylex.props(styles.axis)} />
        <line x1={x0} x2={x0} y1={y(ymax)} y2={y(ymin)} {...stylex.props(styles.axis)} />
        <g clipPath={`url(#${clip})`}>
          {frame.series.map((series, index) => (
            <g key={index} {...stylex.props(seriesColors[index % seriesColors.length])}>
              {series.paths.map((points, i) => seriesSegment(series, points, i))}
            </g>
          ))}
        </g>
        {handle && (
          <circle cx={x(handle[0])} cy={y(handle[1])} r={18}
            onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={drag}
            {...stylex.props(styles.handle)} />
        )}
      </svg>
      <ul aria-label={t`Légende du graphique`} {...stylex.props(styles.legend)}>
        {frame.series.map((series, index) => (
          <li key={index} translate="no" {...stylex.props(styles.legendItem)}>
            <span aria-hidden="true" {...stylex.props(styles.key, seriesColors[index % seriesColors.length],
              series.style === 'dashed' && styles.dashedKey, series.style === 'points' && styles.pointKey,
              (series.style === 'area' || series.style === 'bars') && styles.filledKey)} />
            <MathText text={series.label} />
          </li>
        ))}
      </ul>
    </>
  );
}
