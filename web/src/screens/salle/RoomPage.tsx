import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {useSession, useStore} from '../../app/session';
import {createRoomSession} from '../../lib/room-session';
import {en} from '../../theme/ednova.stylex';
import {Directional} from '../../ui/Directional';
import {Icon} from '../../ui/icons';
import {LockedNotice} from '../plans/LockedNotice';
import {usePlan} from '../plans/queries';
import {Consent} from './Consent';
import {Invite} from './Invite';
import {Members} from './Members';
import {Posts} from './Posts';
import {useRoomConsent, type RoomDetail, type RoomsStore} from './queries';
import {RoomSettings} from './RoomSettings';
import {SessionPanel} from './SessionPanel';
import {shared} from './styles';

const styles = stylex.create({
  page: {display: 'grid', gap: en.space6, minInlineSize: 0},
  head: {display: 'grid', gap: en.space2, justifyItems: 'start', minInlineSize: 0},
  board: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr) minmax(0, 22rem)', '@media (width < 1000px)': 'minmax(0, 1fr)'},
    alignItems: 'start',
    gap: en.space6,
    minInlineSize: 0,
  },
  aside: {
    display: 'grid',
    gap: en.space4,
    minInlineSize: 0,
    gridColumn: {default: 2, '@media (width < 1000px)': 1},
    gridRow: 1,
  },
  main: {
    display: 'grid',
    gap: en.space4,
    minInlineSize: 0,
    gridColumn: 1,
    gridRow: {default: 1, '@media (width < 1000px)': 2},
  },
  title: {overflowWrap: 'anywhere'},
  leave: {display: 'grid', gap: en.space2, minInlineSize: 0},
});

export interface RoomPageProps {
  room: RoomDetail;
  rooms: RoomsStore;
  pseudo: string | null;
  busy: boolean;
  onBack: () => void;
}

export function RoomPage({room, rooms, pseudo, busy, onBack}: RoomPageProps): React.JSX.Element {
  const {api} = useSession();
  const {t} = useLingui();
  const store = useMemo(() => createRoomSession(api, room.id), [api, room.id]);
  const state = useStore(store);
  const [confirming, setConfirming] = useState(false);
  const consent = useRoomConsent(room.id);
  const {plan} = usePlan();
  const navigate = useNavigate();

  useEffect(() => {
    store.startPolling();
    void store.refresh();
    return store.stopPolling;
  }, [store]);
  useEffect(() => {
    if (state.room) rooms.update(state.room);
  }, [state.room, rooms]);
  useEffect(() => {
    if (state.status === 'gone') rooms.gone(room.id);
  }, [state.status, rooms, room.id]);

  const leaveLabel = room.owner ? t`Fermer la salle` : t`Quitter la salle`;
  const confirmLabel = room.owner ? t`Confirmer la fermeture` : t`Confirmer le départ`;

  return (
    <section aria-label={room.name} {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.head)}>
        <Button
          variant="ghost"
          size="sm"
          label={t`Mes salles`}
          icon={
            <Directional>
              <Icon name="chevron-left" size={20} />
            </Directional>
          }
          onClick={onBack}
        />
        <h2 translate="no" {...stylex.props(shared.h2, styles.title)}>
          {room.name}
        </h2>
        {plan === 'pro' && (
          <Button variant="secondary" size="sm" label={t`Duel Exam`} icon={<Icon name="users" size={20} />} onClick={() => void navigate(`/salle/${room.id}/duel`)} />
        )}
        {plan === 'free' && <LockedNotice title={t`Duel Exam`} reason={t`Affronte un autre membre Pro sur la même épreuve chronométrée. Réservé à l’offre Pro.`} />}
      </div>
      <div {...stylex.props(styles.board)}>
        <div {...stylex.props(styles.aside)}>
          <Invite room={room} />
          <Members room={room} pseudo={pseudo} store={store} busy={busy || state.busy} />
          <RoomSettings room={room} rooms={rooms} />
          <Consent roomId={room.id} />
        </div>
        <div {...stylex.props(styles.main)}>
          <SessionPanel room={room} store={store} state={state} />
          <Posts
            room={room}
            rooms={rooms}
            polled={state.posts}
            sessionActive={state.status === 'active'}
            canRate={plan === 'pro' && state.status === 'active' && consent.data?.allow_group_insights === true}
            onPosted={() => {
              if (state.status === 'active') void store.refresh();
            }}
          />
        </div>
      </div>
      <section aria-label={leaveLabel} {...stylex.props(styles.leave)}>
        {confirming && (
          <p {...stylex.props(shared.muted)}>
            {room.owner ? (
              <Trans>La salle et ses publications seront supprimées pour tous ses membres.</Trans>
            ) : (
              <Trans>Tu pourras revenir avec le code d’invitation.</Trans>
            )}
          </p>
        )}
        <div {...stylex.props(shared.actions)}>
          <Button
            variant={confirming ? 'destructive' : 'secondary'}
            label={confirming ? confirmLabel : leaveLabel}
            isDisabled={busy}
            onClick={() => (confirming ? void rooms.leave(room) : setConfirming(true))}
          />
          {confirming && <Button variant="ghost" label={t`Annuler`} isDisabled={busy} onClick={() => setConfirming(false)} />}
        </div>
      </section>
    </section>
  );
}
