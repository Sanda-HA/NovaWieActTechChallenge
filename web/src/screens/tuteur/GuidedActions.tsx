import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {plural} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';

export interface GuidedActionsProps {
  /** Hints already given. */
  used: number;
  /** Hints available before the learner must answer. */
  total?: number;
  waiting?: boolean;
  onHint: () => void;
  onAttempt: () => void;
  onNewQuestion: () => void;
}

const styles = stylex.create({
  bar: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `${en.space2} ${en.space4}`, minInlineSize: 0},
  ladder: {display: 'flex', alignItems: 'flex-end', gap: 3, flexShrink: 0, blockSize: 28},
  step: {
    display: 'block',
    inlineSize: 14,
    borderRadius: en.radiusTessera,
    backgroundColor: en.surfaceSunken,
    boxShadow: `inset 0 0 0 1px ${en.lineStrong}`,
  },
  climbed: {backgroundColor: en.masteryMedium, boxShadow: 'none'},
  next: {boxShadow: `inset 0 0 0 2px ${en.masteryMedium}`},
  top: {backgroundColor: en.ocreSoft, boxShadow: `inset 0 0 0 1px ${en.ocre}`},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space2, minInlineSize: 0},
});

/** The ladder: one tessera per hint, then the learner's own answer at the top. */
function HintLadder({given, total}: {given: number; total: number}): React.JSX.Element {
  const {t} = useLingui();
  const used = Math.max(0, Math.min(total, given));
  const steps = t`${plural(used, {one: '# marche montée', other: '# marches montées'})} sur ${total}, puis ta réponse`;
  return (
    <div role="img" aria-label={t`Échelle d’indices : ${steps}`} {...stylex.props(styles.ladder)}>
      {Array.from({length: total + 1}, (_, index) => (
        <span
          key={index}
          style={{blockSize: 8 + index * 6}}
          {...stylex.props(styles.step, index === total ? styles.top : index < used ? styles.climbed : index === used && styles.next)}
        />
      ))}
    </div>
  );
}

/** Guided exercise: take a hint, write the answer, or move on to another exercise. */
export function GuidedActions({used, total = 2, waiting, onHint, onAttempt, onNewQuestion}: GuidedActionsProps): React.JSX.Element {
  const {t} = useLingui();
  const spent = used >= total;
  return (
    <div role="toolbar" aria-label={t`Mode guidé`} aria-busy={waiting || undefined} {...stylex.props(styles.bar)}>
      <HintLadder given={used} total={total} />
      <div {...stylex.props(styles.actions)}>
        <Button variant="secondary" size="sm" icon={<Icon name="stairs" size={16} />} label={`${spent ? t`Plus d’indice` : t`Un indice`} ${used}/${total}`} isDisabled={waiting || spent} onClick={onHint} />
        <Button variant="primary" size="sm" icon={<Icon name="pen" size={16} />} label={t`Ma réponse`} isDisabled={waiting} onClick={onAttempt} />
        <Button variant="secondary" size="sm" icon={<Icon name="new-question" size={16} />} label={t`Nouvelle question`} isDisabled={waiting} onClick={onNewQuestion} />
      </div>
    </div>
  );
}
