import * as stylex from '@stylexjs/stylex';
import {useLingui} from '@lingui/react/macro';
import {Link} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {PlanBadge} from './PlanBadge';
import {usePlan} from './queries';

const styles = stylex.create({
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    minBlockSize: en.sizeTouch,
    borderRadius: en.radiusFull,
    textDecoration: 'none',
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
});

/** The learner's current plan in the shell; opens the offers page. Renders nothing until the server has answered. */
export function PlanChip(): React.JSX.Element | null {
  const {t} = useLingui();
  const {plan} = usePlan();
  if (!plan) return null;
  const name = plan === 'pro' ? t`Pro` : t`Gratuit`;
  return (
    <Link to="/offres" aria-label={t`Mon offre : ${name}. Voir les offres`} {...stylex.props(styles.link)}>
      <PlanBadge plan={plan} />
    </Link>
  );
}
