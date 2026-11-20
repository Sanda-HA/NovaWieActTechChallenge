import * as stylex from '@stylexjs/stylex';
import {colorVars, spacingVars} from '@astryxdesign/core/theme/tokens.stylex';
import type {MessageDescriptor} from '@lingui/core';
import {msg, plural} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {en} from '../theme/ednova.stylex';
import {intlLocale} from '../lib/i18n-store';

export interface StreakProps {
  days: number;
  /** Shows how many days remain before the next stage. Default true. */
  showNext?: boolean;
}

type Stage = 'bouton' | 'fleur' | 'bouquet' | 'machmoum' | 'machmoum-or';

export const STREAK_STAGES: ReadonlyArray<{stage: Stage; from: number; name: MessageDescriptor}> = [
  {stage: 'bouton', from: 1, name: msg`Bouton`},
  {stage: 'fleur', from: 3, name: msg`Fleur`},
  {stage: 'bouquet', from: 7, name: msg`Bouquet`},
  {stage: 'machmoum', from: 14, name: msg`Machmoum`},
  {stage: 'machmoum-or', from: 30, name: msg`Machmoum d’or`},
];

const styles = stylex.create({
  streak: {display: 'flex', alignItems: 'center', gap: spacingVars['--spacing-3'], minWidth: 0},
  text: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-0-5'], minWidth: 0},
  count: {display: 'flex', alignItems: 'baseline', gap: spacingVars['--spacing-1'], margin: 0, color: colorVars['--color-text-primary']},
  numeral: {
    fontFamily: en.fontDisplay,
    fontSize: en.typeNumeralSize,
    lineHeight: en.typeNumeralLeading,
    fontWeight: en.typeNumeralWeight,
    fontVariantNumeric: 'tabular-nums',
  },
  unit: {
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: en.typeLabelWeight,
  },
  stage: {
    margin: 0,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
    color: colorVars['--color-text-secondary'],
    textWrap: 'pretty',
  },
  art: {display: 'block', flexShrink: 0, overflow: 'visible'},
  stem: {fill: 'none', stroke: en.faience, strokeWidth: 2.2, strokeLinecap: 'round'},
  leaf: {fill: en.faience},
  petal: {fill: en.novaJasmine, stroke: en.lineStrong, strokeWidth: 1},
  heart: {fill: en.ocre},
  ribbon: {fill: en.argile},
  halo: {fill: 'none', stroke: en.ocre, strokeWidth: 2.5},
  seed: {fill: 'none', stroke: en.masteryUnknown, strokeWidth: 2, strokeDasharray: '3 3'},
});

function stageFor(days: number): Stage | null {
  let stage: Stage | null = null;
  for (const step of STREAK_STAGES) if (days >= step.from) stage = step.stage;
  return stage;
}

const Stem = ({d}: {d: string}) => <path d={d} {...stylex.props(styles.stem)} />;

function Flower({x, y, r}: {x: number; y: number; r: number}) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map(turn => (
        <ellipse
          key={turn}
          cx={x}
          cy={y - r * 0.55}
          rx={r * 0.38}
          ry={r * 0.62}
          transform={`rotate(${turn} ${x} ${y})`}
          {...stylex.props(styles.petal)}
        />
      ))}
      <circle cx={x} cy={y} r={r * 0.24} {...stylex.props(styles.heart)} />
    </g>
  );
}

function Bud({x, y, r, turn = 0}: {x: number; y: number; r: number; turn?: number}) {
  const d = `M${x} ${y - r}C${x + r * 0.42} ${y - r * 0.45} ${x + r * 0.32} ${y} ${x} ${y}C${x - r * 0.32} ${y} ${x - r * 0.42} ${y - r * 0.45} ${x} ${y - r}Z`;
  return <path d={d} transform={turn ? `rotate(${turn} ${x} ${y})` : undefined} {...stylex.props(styles.petal)} />;
}

/** The jasmine for a stage: a bud, a flower, a bouquet, then the machmoum (gold at 30 days). */
function Jasmine({stage, size}: {stage: Stage | null; size: number}) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" {...stylex.props(styles.art)}>
      {stage === null && <circle cx={24} cy={24} r={9} {...stylex.props(styles.seed)} />}
      {stage === 'bouton' && (
        <>
          <Stem d="M24 42V27" />
          <path d="M24 34c-4-1-6.5-3.5-7-7 3.5.3 6 2.6 7 7Z" {...stylex.props(styles.leaf)} />
          <Bud x={24} y={28} r={17} />
        </>
      )}
      {stage === 'fleur' && (
        <>
          <Stem d="M24 43V28" />
          <path d="M24 37c-4-1-6.5-3.5-7-7 3.5.3 6 2.6 7 7Z" {...stylex.props(styles.leaf)} />
          <Flower x={24} y={20} r={13} />
        </>
      )}
      {stage === 'bouquet' && (
        <>
          <Stem d="M24 44 16 27M24 44V22M24 44l8-17" />
          <Flower x={15} y={22} r={9} />
          <Flower x={33} y={22} r={9} />
          <Flower x={24} y={14} r={10} />
        </>
      )}
      {(stage === 'machmoum' || stage === 'machmoum-or') && (
        <>
          {stage === 'machmoum-or' && <circle cx={24} cy={21} r={20} {...stylex.props(styles.halo)} />}
          <Stem d="M24 45 18 33M24 45V33M24 45l6-12" />
          <rect x={18.5} y={34} width={11} height={4} rx={1.5} {...stylex.props(styles.ribbon)} />
          <Bud x={12} y={30} r={9} turn={-40} />
          <Bud x={36} y={30} r={9} turn={40} />
          <Bud x={15} y={21} r={9} turn={-25} />
          <Bud x={33} y={21} r={9} turn={25} />
          <Flower x={18} y={15} r={8} />
          <Flower x={30} y={15} r={8} />
          <Flower x={24} y={24} r={9} />
          <Flower x={24} y={9} r={7} />
        </>
      )}
    </svg>
  );
}

/** Consecutive study days, grown as a jasmine: never a flame, never a loss. */
export function Streak({days, showNext = true}: StreakProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const stage = stageFor(days);
  const current = STREAK_STAGES.find(step => step.stage === stage);
  const next = STREAK_STAGES.find(step => step.from > days);
  const left = next ? next.from - days : 0;
  const nextName = next ? i18n._(next.name) : '';
  // French keeps the old unit: "jour" up to 1, then "jours de suite"; English says "days in a row" from 0.
  const unit = t`${plural(days, {one: 'jour', other: 'jours de suite'})}`;
  return (
    <div
      role="group"
      aria-label={t`Série\u00a0: ${plural(days, {one: '#\u00a0jour', other: '#\u00a0jours'})} de suite`}
      {...stylex.props(styles.streak)}>
      <Jasmine stage={stage} size={56} />
      <div {...stylex.props(styles.text)}>
        <p {...stylex.props(styles.count)}>
          <span {...stylex.props(styles.numeral)}>{new Intl.NumberFormat(intlLocale(i18n.locale)).format(days)}</span>
          <span {...stylex.props(styles.unit)}>{unit}</span>
        </p>
        <p {...stylex.props(styles.stage)}>
          {days === 0 ? t`Une séance aujourd’hui fait éclore le premier bouton.` : current && i18n._(current.name)}
          {showNext &&
            next &&
            days > 0 &&
            ` · ${t`encore ${plural(left, {one: '#\u00a0jour', other: '#\u00a0jours'})} avant le palier «\u00a0${nextName}\u00a0»`}`}
        </p>
      </div>
    </div>
  );
}
