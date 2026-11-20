import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {useNavigate, useParams} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {Directional} from '../../ui/Directional';
import {Icon} from '../../ui/icons';
import {LockedNotice} from '../plans/LockedNotice';
import {usePlan} from '../plans/queries';
import {ScreenTitle} from '../ScreenTitle';
import {DuelRoom} from './DuelRoom';
import {Lobby} from './Lobby';

const styles = stylex.create({
  page: {display: 'grid', gap: en.space6, minInlineSize: 0},
  head: {display: 'grid', gap: en.space2, justifyItems: 'start', minInlineSize: 0},
});

/** `/salle/:id/duel` is the room's duel lobby; `/salle/:id/duel/:duelId` is one duel. Pro only, on the server's plan. */
export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const navigate = useNavigate();
  const {id = '', duelId} = useParams();
  const {plan} = usePlan();

  return (
    <div {...stylex.props(styles.page)}>
      <ScreenTitle>
        <Trans>Duel Exam</Trans>
      </ScreenTitle>
      <div {...stylex.props(styles.head)}>
        <Button
          variant="ghost"
          size="sm"
          label={duelId ? t`Mes duels` : t`Retour à la salle`}
          icon={
            <Directional>
              <Icon name="chevron-left" size={20} />
            </Directional>
          }
          onClick={() => void navigate(duelId ? `/salle/${id}/duel` : `/salle/${id}`)}
        />
      </div>
      {plan === null ? (
        <Skeleton width="100%" height="10rem" />
      ) : plan === 'free' ? (
        <LockedNotice
          title={t`Duel Exam`}
          reason={t`Affronte un autre membre Pro sur la même épreuve chronométrée. Réservé à l’offre Pro, activée par l’équipe Nova : tu peux demander l’accès depuis la page des offres.`}
        />
      ) : duelId ? (
        <DuelRoom key={duelId} roomId={id} duelId={duelId} />
      ) : (
        <Lobby roomId={id} />
      )}
    </div>
  );
}
