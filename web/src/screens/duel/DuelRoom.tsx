import * as stylex from '@stylexjs/stylex';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {describeDuelError, formatClock, timeline, type DuelPhase, type DuelPlayer, type DuelView} from '../../lib/duel';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {Icon} from '../../ui/icons';
import {shared} from '../salle/styles';
import {DuelError} from './DuelError';
import {useLanguageName, useNow, useTopicLabel} from './hooks';
import {Play} from './Play';
import {useDuel, useDuelActions, useExam} from './queries';
import {Result} from './Result';

const styles = stylex.create({
  novaRow: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  page: {display: 'grid', gap: en.space4, minInlineSize: 0},
  card: {
    display: 'grid',
    gap: en.space3,
    minInlineSize: 0,
    padding: en.space5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
  },
  big: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: '3rem',
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  code: {
    margin: 0,
    color: en.ink,
    fontSize: en.typeHeadingSize,
    letterSpacing: '0.2em',
    userSelect: 'all',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  player: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${en.space2} ${en.space3}`,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
  },
  grow: {flex: '1 1 8rem', minInlineSize: 0, overflowWrap: 'anywhere'},
});

function Players({view}: {view: DuelView}): React.JSX.Element {
  const {t} = useLingui();
  const label = (player: DuelPlayer) => player.pseudo ?? t`Adversaire`;
  const slots = [1, 2] as const;
  return (
    <ul aria-label={t`Joueurs`} {...stylex.props(shared.list)}>
      {slots.map(slot => {
        const player = view.players.find(item => item.slot === slot);
        const me = view.my_slot === slot;
        return (
          <li key={slot} {...stylex.props(styles.player)}>
            <span translate="no" {...stylex.props(shared.body, styles.grow)}>
              {player ? label(player) : t`En attente d’un adversaire`}
              {me && ` (${t`toi`})`}
            </span>
            {player && view.status === 'lobby' && (
              <Badge variant={player.ready ? 'success' : 'neutral'} label={player.ready ? t`Prêt` : t`Pas prêt`} />
            )}
            {player && view.status === 'scheduled' && <Badge variant="success" label={t`Prêt`} />}
            {player && (view.status === 'running' || view.status === 'grading') && (
              <Badge
                variant="neutral"
                label={
                  player.submission_state === 'submitted'
                    ? t`Copie rendue`
                    : player.submission_state === 'forfeit'
                      ? t`Abandon`
                      : t`${player.answered_count} réponses`
                }
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CopyCode({code}: {code: string}): React.JSX.Element {
  const {t} = useLingui();
  const [message, setMessage] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(t`Code copié.`);
    } catch {
      setMessage(t`Copie impossible : sélectionne le texte et copie-le toi-même.`);
    }
  };
  return (
    <>
      <div {...stylex.props(shared.actions)}>
        <Button variant="secondary" icon={<Icon name="copy" size={20} />} label={t`Copier le code`} onClick={() => void copy()} />
      </div>
      {message && (
        <p role="status" {...stylex.props(shared.caption)}>
          {message}
        </p>
      )}
    </>
  );
}

const WAITING: Partial<Record<DuelPhase, true>> = {invited: true, lobby: true};

export interface DuelRoomProps {
  roomId: string;
  duelId: string;
}

/** One duel from invitation to result, driven by the server's phase and the synchronised clock. */
export function DuelRoom({roomId, duelId}: DuelRoomProps): React.JSX.Element {
  const {t} = useLingui();
  const navigate = useNavigate();
  const query = useDuel(roomId, duelId);
  const view = query.data?.view;
  const offset = query.data?.offset ?? 0;
  const exam = useExam(roomId, duelId, view?.status);
  const {accept, ready, withdraw} = useDuelActions(roomId);
  const topicLabel = useTopicLabel();
  const languageName = useLanguageName();
  const [conceding, setConceding] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const status = view?.status;
  const active = status === 'invited' || status === 'lobby' || status === 'scheduled' || status === 'running';
  const now = useNow(active);

  useEffect(() => {
    if (status && status !== 'running') heading.current?.focus({preventScroll: true});
  }, [status]);

  if (!view) {
    if (query.isError) return <DuelError error={query.error} onRetry={() => void query.refetch()} />;
    return <Skeleton width="100%" height="10rem" />;
  }

  const line = timeline(view, offset, now);
  const serverNow = now + offset;
  const left = (iso: string | null) => (iso ? Math.max(0, Date.parse(iso) - serverNow) : 0);
  const me = view.players.find(player => player.slot === view.my_slot);
  const received = view.status === 'invited' && view.my_slot === null;
  const back = () => void navigate(`/salle/${roomId}/duel`);
  const room = () => void navigate(`/salle/${roomId}`);
  const failure = [accept, ready, withdraw].find(mutation => mutation.isError)?.error;
  const closed = view.status === 'expired' || view.status === 'cancelled';
  const leave = (label: string) => (
    <Button variant="ghost" label={label} isLoading={withdraw.isPending} onClick={() => withdraw.mutate(duelId)} />
  );

  let body: React.ReactNode;
  let title = topicLabel(view.topic);
  if (closed) {
    title = view.status === 'expired' ? t`Ce duel a expiré` : t`Ce duel est annulé`;
    body = (
      <>
        <p role="status" {...stylex.props(shared.muted)}>
          {view.status === 'expired'
            ? t`Personne n’a démarré à temps. Tu peux créer un nouveau duel.`
            : t`Un des joueurs a quitté le duel avant le début.`}
        </p>
        <div {...stylex.props(shared.actions)}>
          <Button variant="primary" label={t`Retour aux duels`} onClick={back} />
        </div>
      </>
    );
  } else if (view.status === 'invited') {
    const remaining = formatClock(left(view.invite_expires_at));
    body = (
      <>
        {view.invite_code && view.my_slot === 1 && (
          <div {...stylex.props(styles.card)}>
            <p {...stylex.props(shared.kicker)}>
              <Trans>Code à donner à ton adversaire</Trans>
            </p>
            <p aria-label={t`Code du duel`} translate="no" {...stylex.props(styles.code)}>
              {view.invite_code}
            </p>
            <p {...stylex.props(shared.caption)}>
              <Trans>Il le saisit dans « Rejoindre avec un code ».</Trans>
            </p>
            <CopyCode code={view.invite_code} />
          </div>
        )}
        <div {...stylex.props(styles.novaRow)}>
          <Mascot mood="idle" breathe size={56} />
          <p role="timer" {...stylex.props(shared.muted)}>
          {received ? t`Invitation valable encore ${remaining}.` : t`En attente de ton adversaire : l’invitation expire dans ${remaining}.`}
          </p>
        </div>
        <Players view={view} />
        <div {...stylex.props(shared.actions)}>
          {received && <Button variant="primary" label={t`Accepter le duel`} isLoading={accept.isPending} onClick={() => accept.mutate(duelId)} />}
          {!received && leave(t`Annuler l’invitation`)}
          <Button variant="ghost" label={t`Retour aux duels`} onClick={back} />
        </div>
      </>
    );
  } else if (view.status === 'lobby') {
    const remaining = formatClock(left(view.ready_expires_at));
    const imReady = me?.ready === true;
    body = (
      <>
        <Players view={view} />
        <div {...stylex.props(styles.novaRow)}>
          <Mascot mood="idle" breathe size={56} />
          <p role="timer" {...stylex.props(shared.muted)}>
          {t`Le duel démarre dès que vous êtes prêts tous les deux, dans ${remaining} au plus.`}
          </p>
        </div>
        <div {...stylex.props(shared.actions)}>
          <Button
            variant={imReady ? 'secondary' : 'primary'}
            label={imReady ? t`Je ne suis plus prêt` : t`Je suis prêt`}
            isLoading={ready.isPending}
            onClick={() => ready.mutate({duelId, ready: !imReady})}
          />
          {leave(t`Quitter le duel`)}
        </div>
      </>
    );
  } else if (view.status === 'scheduled') {
    body = (
      <>
        <p role="timer" aria-label={t`Début dans`} {...stylex.props(styles.big)}>
          {line.stage === 'countdown' ? Math.ceil(line.toStart / 1000) : '…'}
        </p>
        <p role="status" {...stylex.props(shared.muted)}>
          {line.stage === 'countdown' ? t`L’épreuve commence : vous êtes prêts tous les deux, la préparation est verrouillée.` : t`C’est parti : ouverture de l’épreuve…`}
        </p>
        <Players view={view} />
        <div {...stylex.props(shared.actions)}>{leave(t`Quitter avant le début`)}</div>
      </>
    );
  } else if (view.status === 'running') {
    title = t`Duel Exam · ${topicLabel(view.topic)}`;
    body = exam.data ? (
      <Play
        key={exam.data.exam_id}
        roomId={roomId}
        duelId={duelId}
        view={view}
        exam={exam.data}
        remaining={line.toDeadline}
        onConcede={() => setConceding(true)}
      />
    ) : exam.isError ? (
      <DuelError error={exam.error} onRetry={() => void exam.refetch()} />
    ) : (
      <Skeleton width="100%" height="12rem" />
    );
  } else if (view.status === 'grading') {
    body = (
      <>
        <p role="status" {...stylex.props(shared.muted)}>
          <Trans>Le temps est écoulé. La correction est en cours, le résultat arrive dans un instant.</Trans>
        </p>
        <Players view={view} />
      </>
    );
  } else {
    title = t`Résultat du duel`;
    body = <Result roomId={roomId} duelId={duelId} view={view} exam={exam.data} />;
  }

  const showConcede = view.status === 'running';
  const code = failure ? describeDuelError(failure) : null;
  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(shared.actions)}>
        <h3 ref={heading} tabIndex={-1} {...stylex.props(shared.h2)}>
          {title}
        </h3>
        {!WAITING[view.status] && !closed && view.status !== 'finished' && (
          <Badge variant="info" label={languageName(view.language)} />
        )}
      </div>
      {code && failure && <DuelError error={failure} />}
      {body}
      {view.status === 'finished' || closed ? null : (
        <div {...stylex.props(shared.actions)}>
          <Button variant="ghost" size="sm" label={t`Retour à la salle`} onClick={room} />
        </div>
      )}
      {showConcede && (
        <AlertDialog
          isOpen={conceding}
          onOpenChange={next => !withdraw.isPending && setConceding(next)}
          title={t`Abandonner le duel ?`}
          description={t`L’abandon décide le duel : ton adversaire gagne et tu ne pourras pas reprendre.`}
          actionLabel={t`Confirmer l’abandon`}
          actionVariant="destructive"
          cancelLabel={t`Continuer le duel`}
          isActionLoading={withdraw.isPending}
          onAction={() => withdraw.mutate(duelId, {onSettled: () => setConceding(false)})}
        />
      )}
    </div>
  );
}
