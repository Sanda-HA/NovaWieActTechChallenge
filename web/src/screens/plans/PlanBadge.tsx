import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {useLingui} from '@lingui/react/macro';
import type {StudentPlan} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';

const styles = stylex.create({mark: {marginInlineStart: en.space2, verticalAlign: 'middle'}});

export function PlanBadge({plan}: {plan: StudentPlan}): React.JSX.Element {
  const {t} = useLingui();
  return <Badge variant={plan === 'pro' ? 'info' : 'neutral'} label={plan === 'pro' ? t`Pro` : t`Gratuit`} />;
}

/** A quiet Pro marker for the heading of a Pro-only feature; callers show it to Free learners only. */
export function ProMark(): React.JSX.Element {
  return (
    <span {...stylex.props(styles.mark)}>
      <PlanBadge plan="pro" />
    </span>
  );
}
