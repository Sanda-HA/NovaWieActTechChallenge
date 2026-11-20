import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Trans, useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {isOver, type DuelView} from '../../lib/duel';
import {en} from '../../theme/ednova.stylex';
import {EmptyNote} from '../../ui/EmptyNote';
import {shared} from '../salle/styles';
import {DuelError} from './DuelError';
import {useClockTime, useLanguageName, useTopicLabel} from './hooks';
import {useBlueprints, useDuelActions, useDuels} from './queries';

const styles = stylex.create({
  grid: {display: 'grid', gap: en.space4, minInlineSize: 0},
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${en.space2} ${en.space3}`,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
  },
  rowText: {display: 'grid', gap: 2, flex: '1 1 12rem', minInlineSize: 0},
  form: {display: 'grid', gap: en.space3, maxInlineSize: 480, minInlineSize: 0},
});

const CODE_LENGTH = 8;
const PSEUDO = /^[A-Za-z0-9]{3,30}$/;

function useOpen(roomId: string) {
  const navigate = useNavigate();
  return (duelId: string) => void navigate(`/salle/${roomId}/duel/${duelId}`);
}

function Create({roomId}: {roomId: string}): React.JSX.Element {
  const {t} = useLingui();
  const blueprints = useBlueprints(roomId);
  const {create} = useDuelActions(roomId);
  const open = useOpen(roomId);
  const topicLabel = useTopicLabel();
  const languageName = useLanguageName();
  const [chosen, setChosen] = useState('');
  const [opponent, setOpponent] = useState('');
  const items = blueprints.data ?? [];
  const blueprintId = items.some(item => item.id === chosen) ? chosen : (items[0]?.id ?? '');
  const pseudo = opponent.trim();
  const invalidPseudo = pseudo !== '' && !PSEUDO.test(pseudo);

  return (
    <section aria-label={t`Créer un duel`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.h2)}>
        <Trans>Créer un duel</Trans>
      </h3>
      <p {...stylex.props(shared.muted)}>
        <Trans>Vous passez la même épreuve chronométrée, chacun de votre côté. Les deux joueurs doivent avoir l’offre Pro.</Trans>
      </p>
      {blueprints.isPending ? (
        <Skeleton width="100%" height="6rem" />
      ) : blueprints.isError ? (
        <DuelError error={blueprints.error} onRetry={() => void blueprints.refetch()} />
      ) : items.length === 0 ? (
        <EmptyNote>
          <p role="status" {...stylex.props(shared.muted)}>
            <Trans>Aucune épreuve n’est disponible pour le moment.</Trans>
          </p>
        </EmptyNote>
      ) : (
        <form
          noValidate
          onSubmit={event => {
            event.preventDefault();
            if (blueprintId && !invalidPseudo && !create.isPending) {
              create.mutate({blueprintId, opponent: pseudo || undefined}, {onSuccess: view => open(view.duel_id)});
            }
          }}
          {...stylex.props(styles.form)}>
          <RadioList label={t`Épreuve`} value={blueprintId} onChange={setChosen}>
            {items.map(item => (
              <RadioListItem
                key={item.id}
                value={item.id}
                label={topicLabel(item.topic)}
                description={t`${languageName(item.language)} · ${item.item_count} questions · ${Math.round(item.duration_seconds / 60)} min`}
              />
            ))}
          </RadioList>
          <TextInput
            label={t`Inviter un membre (facultatif)`}
            htmlName="duel-opponent"
            autoComplete="off"
            hasSpellCheck={false}
            description={t`Son pseudo, tel qu’il apparaît dans la salle. Sans pseudo, tu reçois un code à lui donner.`}
            status={invalidPseudo ? {type: 'error', message: t`Le pseudo compte 3 à 30 lettres ou chiffres.`} : undefined}
            value={opponent}
            onChange={setOpponent}
          />
          <div {...stylex.props(shared.actions)}>
            <Button type="submit" variant="primary" label={t`Créer le duel`} isLoading={create.isPending} isDisabled={invalidPseudo || create.isPending} />
          </div>
          {create.isError && <DuelError error={create.error} />}
        </form>
      )}
    </section>
  );
}

function Join({roomId}: {roomId: string}): React.JSX.Element {
  const {t} = useLingui();
  const {join} = useDuelActions(roomId);
  const open = useOpen(roomId);
  const [code, setCode] = useState('');
  const ready = code.length === CODE_LENGTH;
  return (
    <form
      noValidate
      aria-label={t`Rejoindre avec un code`}
      onSubmit={event => {
        event.preventDefault();
        if (ready && !join.isPending) join.mutate(code, {onSuccess: view => open(view.duel_id)});
      }}
      {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.h2)}>
        <Trans>Rejoindre avec un code</Trans>
      </h3>
      <div {...stylex.props(styles.form)}>
        <TextInput
          label={t`Code du duel`}
          htmlName="duel-code"
          autoComplete="off"
          hasSpellCheck={false}
          description={t`Les 8 caractères que ton adversaire t’a donnés.`}
          value={code}
          onChange={value => setCode(value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH))}
        />
        <div {...stylex.props(shared.actions)}>
          <Button type="submit" variant="secondary" label={t`Rejoindre le duel`} isLoading={join.isPending} isDisabled={!ready || join.isPending} />
        </div>
        {join.isError && <DuelError error={join.error} />}
      </div>
    </form>
  );
}

function Row({roomId, duel}: {roomId: string; duel: DuelView}): React.JSX.Element {
  const {t} = useLingui();
  const {accept} = useDuelActions(roomId);
  const open = useOpen(roomId);
  const topicLabel = useTopicLabel();
  const time = useClockTime();
  const received = duel.status === 'invited' && duel.my_slot === null;
  const sent = duel.status === 'invited' && duel.my_slot !== null;
  const other = duel.players.find(player => player.slot !== duel.my_slot)?.pseudo;
  const state: Record<DuelView['status'], string> = {
    invited: received ? t`Invitation reçue` : t`Invitation envoyée`,
    lobby: t`Salle d’attente`,
    scheduled: t`Va commencer`,
    running: t`En cours`,
    grading: t`Correction`,
    finished: t`Terminé`,
    expired: t`Expiré`,
    cancelled: t`Annulé`,
  };
  return (
    <li {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.rowText)}>
        <span {...stylex.props(shared.body)}>
          {topicLabel(duel.topic)} <Badge variant={isOver(duel.status) ? 'neutral' : 'info'} label={state[duel.status]} />
        </span>
        {(received || sent) && (
          <span {...stylex.props(shared.caption)}>
            {received && other ? t`De ${other}. ` : ''}
            {t`Expire à ${time(duel.invite_expires_at)}.`}
          </span>
        )}
      </div>
      {received ? (
        <Button
          variant="primary"
          size="sm"
          label={t`Accepter`}
          isLoading={accept.isPending}
          onClick={() => accept.mutate(duel.duel_id, {onSuccess: view => open(view.duel_id)})}
        />
      ) : (
        <Button variant="secondary" size="sm" label={isOver(duel.status) ? t`Voir` : t`Ouvrir`} onClick={() => open(duel.duel_id)} />
      )}
      {accept.isError && accept.variables === duel.duel_id && <DuelError error={accept.error} />}
    </li>
  );
}

function Invitations({roomId}: {roomId: string}): React.JSX.Element {
  const {t} = useLingui();
  const duels = useDuels(roomId);
  const items = duels.data?.items ?? [];
  const current = items.filter(duel => !isOver(duel.status));
  const past = items.filter(duel => isOver(duel.status)).slice(0, 5);
  return (
    <section aria-label={t`Mes duels`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.h2)}>
        <Trans>Mes duels</Trans>
      </h3>
      {duels.isPending ? (
        <Skeleton width="100%" height="4rem" />
      ) : duels.isError && !duels.data ? (
        <DuelError error={duels.error} onRetry={() => void duels.refetch()} />
      ) : items.length === 0 ? (
        <EmptyNote>
          <p role="status" {...stylex.props(shared.muted)}>
            <Trans>Aucun duel pour le moment. Crée-en un, ou saisis un code reçu.</Trans>
          </p>
        </EmptyNote>
      ) : (
        <div {...stylex.props(styles.grid)}>
          {current.length > 0 && (
            <ul {...stylex.props(shared.list)}>
              {current.map(duel => (
                <Row key={duel.duel_id} roomId={roomId} duel={duel} />
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <>
              <h4 {...stylex.props(shared.kicker)}>
                <Trans>Récents</Trans>
              </h4>
              <ul {...stylex.props(shared.list)}>
                {past.map(duel => (
                  <Row key={duel.duel_id} roomId={roomId} duel={duel} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Where a room's duels start: create one (with a named opponent or a code), join with a code, or answer an invitation. */
export function Lobby({roomId}: {roomId: string}): React.JSX.Element {
  return (
    <div {...stylex.props(styles.grid)}>
      <Invitations roomId={roomId} />
      <Create roomId={roomId} />
      <Join roomId={roomId} />
    </div>
  );
}
