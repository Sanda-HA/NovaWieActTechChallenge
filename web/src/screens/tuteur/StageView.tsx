import * as stylex from '@stylexjs/stylex';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';

const STAGES: readonly {id: string; label: MessageDescriptor}[] = [
  {id: 'understanding', label: msg`Je comprends ta question`},
  {id: 'searching', label: msg`Je cherche dans ton manuel`},
  {id: 'writing', label: msg`J’écris la réponse`},
  {id: 'verifying', label: msg`Je vérifie`},
];

const breathe = stylex.keyframes({
  '0%, 100%': {opacity: 0.55},
  '50%': {opacity: 1},
});

const styles = stylex.create({
  stages: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  tiles: {display: 'flex', gap: en.space1, margin: 0, padding: 0, listStyle: 'none'},
  tile: {
    display: 'block',
    inlineSize: 18,
    blockSize: 18,
    borderRadius: en.radiusTessera,
    backgroundColor: en.surfaceSunken,
    boxShadow: `inset 0 0 0 1px ${en.line}`,
    transitionProperty: 'background-color',
    transitionDuration: en.dur2,
    transitionTimingFunction: en.ease,
  },
  done: {backgroundColor: en.masteryStrong, boxShadow: 'none'},
  current: {
    backgroundColor: en.masteryMedium,
    boxShadow: 'none',
    animationName: {default: breathe, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: '1.2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  text: {display: 'grid', gap: 2, minInlineSize: 0, margin: 0},
  label: {color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 600},
  count: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
});

/** Nova working on the answer: four tesserae set one after another, with the stage said in words. */
export function StageView({stage}: {stage?: string}): React.JSX.Element {
  const {i18n, t} = useLingui();
  const found = STAGES.findIndex(item => item.id === stage);
  const index = found < 0 ? 0 : found;
  const current = STAGES[index] as (typeof STAGES)[number];
  const position = index + 1;
  const total = STAGES.length;
  return (
    <div role="status" {...stylex.props(styles.stages)}>
      <Mascot mood="thinking" size={40} />
      <ol aria-hidden="true" {...stylex.props(styles.tiles)}>
        {STAGES.map((item, at) => (
          <li key={item.id} {...stylex.props(styles.tile, at < index && styles.done, at === index && styles.current)} />
        ))}
      </ol>
      <p aria-live="polite" {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.label)}>{`${i18n._(current.label)}…`}</span>
        <span {...stylex.props(styles.count)}>{t`Étape ${position} sur ${total}`}</span>
      </p>
    </div>
  );
}
