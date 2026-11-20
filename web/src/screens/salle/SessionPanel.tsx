import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useState, type FormEvent} from 'react';
import {useServerText} from '../../i18n/serverText';
import type {RoomSessionError, RoomSessionState, createRoomSession} from '../../lib/room-session';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {EmptyNote} from '../../ui/EmptyNote';
import {Icon} from '../../ui/icons';
import {useTopicCatalog} from '../accueil/queries';
import {LockedNotice} from '../plans/LockedNotice';
import {ProMark} from '../plans/PlanBadge';
import {usePlan} from '../plans/queries';
import {AskNova} from './AskNova';
import {Insights} from './Insights';
import {RoomQuiz} from './RoomQuiz';
import {PREFERRED_TOPIC, type RoomDetail} from './queries';
import {shared} from './styles';

const ROUNDS: readonly (readonly [string, MessageDescriptor])[] = [
  ['explain', msg`Explication`],
  ['question', msg`Questions`],
  ['quiz', msg`Quiz`],
  ['ended', msg`Terminée`],
];

const ROUND_HINTS: Record<string, MessageDescriptor> = {
  explain: msg`Chacun explique la notion avec ses mots. Pour de l’aide, demande à Nova ou relis ton texte avec la liste de contrôle.`,
  question: msg`Posez vos questions anonymes sur ce qui reste flou.`,
  quiz: msg`Chacun répond au quiz du chapitre de son côté.`,
};

const SESSION_ERRORS: Record<RoomSessionError['code'], MessageDescriptor> = {
  pro_required: msg`Cette activité est réservée à l’offre Pro.`,
  busy: msg`Nova est très sollicitée. Réessaie dans quelques instants.`,
  forbidden: msg`Seul le propriétaire de la salle peut lancer ou terminer la séance.`,
  conflict: msg`La séance a changé : voici son état à jour.`,
  unknown_topic: msg`Ce chapitre n’est pas disponible.`,
  unavailable: msg`La séance est momentanément indisponible. Réessaie.`,
};

const WORKING = {
  start: msg`Nova prépare l’objectif de la séance…`,
  next: msg`Passage à la manche suivante…`,
  notes: msg`Nova rédige les notes de la séance…`,
} as const;

export const VERDICT_LABELS: Record<string, MessageDescriptor> = {
  correct: msg`Correct`,
  incorrect: msg`À revoir`,
  incomplete: msg`Incomplet`,
  partial: msg`Partiel`,
  unknown: msg`Non vérifié`,
};

/** The store types `my_open_points` as strings; the backend sends these. */
interface OpenPoint {
  id: string;
  verdict: string;
  text: string;
  review_action?: string;
}

const styles = stylex.create({
  goal: {display: 'grid', gap: en.space1, margin: 0},
  rounds: {
    display: 'grid',
    gridTemplateColumns: {default: 'repeat(4, minmax(0, 1fr))', '@media (width < 480px)': 'repeat(2, minmax(0, 1fr))'},
    gap: en.space1,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  round: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: en.space1,
    minInlineSize: 0,
    minBlockSize: '2.75rem',
    paddingBlock: en.space2,
    paddingInline: en.space2,
    borderRadius: en.radiusTessera,
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    textAlign: 'center',
    overflowWrap: 'anywhere',
  },
  upcoming: {backgroundColor: en.surfaceSunken, color: en.inkMuted},
  done: {backgroundColor: en.masteryStrong, color: en.onFaience},
  current: {backgroundColor: en.ocre, color: en.onOcre, fontWeight: 700},
  waiting: {display: 'flex', alignItems: 'center', gap: en.space2, margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize},
  dot: {flexShrink: 0, inlineSize: '0.625rem', blockSize: '0.625rem', borderRadius: en.radiusFull, backgroundColor: en.masteryStrong},
  chapter: {maxInlineSize: '22rem'},
  notes: {
    display: 'grid',
    gap: en.space2,
    margin: 0,
    paddingInlineStart: en.space5,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    overflowWrap: 'anywhere',
  },
  point: {display: 'grid', gap: en.space1},
  action: {color: en.inkMuted, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  pointVerdict: {color: en.ink, fontWeight: 700},
  label: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 700},
});

export interface SessionPanelProps {
  room: RoomDetail;
  store: ReturnType<typeof createRoomSession>;
  state: RoomSessionState;
}

type Action = keyof typeof WORKING;

/** The group session: the owner starts it and moves the rounds along, everyone follows the same four steps. */
export function SessionPanel({room, store, state}: SessionPanelProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const [chosen, setChosen] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const {status, session, busy, error} = state;
  const {plan} = usePlan();

  // The operator may have activated Pro while the learner sat on this page.
  useEffect(() => {
    if (status === 'locked' && plan === 'pro') void store.unlock();
  }, [status, plan, store]);

  const topics = catalog.data?.topics ?? [];
  const topic = chosen || (topics.some(item => item.slug === PREFERRED_TOPIC) ? PREFERRED_TOPIC : (topics[0]?.slug ?? ''));
  const label = session ? serverText(topics.find(item => item.slug === session.topic)?.label ?? session.topic) : '';
  const owner = room.owner_pseudo ?? '';

  const run = async (name: Action, work: () => Promise<void>) => {
    setAction(name);
    try {
      await work();
    } finally {
      setAction(null);
    }
  };
  const start = (event: FormEvent) => {
    event.preventDefault();
    if (topic) void run('start', () => store.start(topic));
  };

  const startForm = room.owner && (
    <form onSubmit={start} {...stylex.props(shared.section)}>
      {catalog.isError && topics.length === 0 ? (
        <ErrorBanner message={t`Les chapitres n’ont pas pu être chargés.`} onRetry={() => void catalog.refetch()} />
      ) : topics.length === 0 ? (
        <Skeleton width="100%" height="2.5rem" />
      ) : (
        <div {...stylex.props(styles.chapter)}>
          <Selector
            label={t`Chapitre de la séance`}
            options={topics.map(item => ({value: item.slug, label: serverText(item.label)}))}
            value={topic}
            isDisabled={busy}
            onChange={setChosen}
          />
        </div>
      )}
      <div {...stylex.props(shared.actions)}>
        <Button type="submit" variant="primary" label={t`Lancer la séance`} isDisabled={busy || !topic} />
      </div>
    </form>
  );

  const waiting = (
    <p role="status" {...stylex.props(styles.waiting)}>
      <span aria-hidden="true" {...stylex.props(styles.dot)} />
      <span>{t`En attente que ${owner} lance la séance…`}</span>
    </p>
  );

  const points = (session?.my_open_points ?? []) as unknown as OpenPoint[];
  const reached = session ? ROUNDS.findIndex(([round]) => round === session.round) : -1;
  const hint = session ? ROUND_HINTS[session.round] : undefined;

  return (
    <section aria-label={t`Séance de groupe`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.kicker)}>
        <Trans>Séance de groupe</Trans>
        {room.owner && plan === 'free' && <ProMark />}
      </h3>
      {error && error.code !== 'pro_required' && <ErrorBanner message={i18n._(SESSION_ERRORS[error.code] ?? SESSION_ERRORS.unavailable)} />}
      {action && busy && (
        <p role="status" {...stylex.props(shared.muted)}>
          {i18n._(WORKING[action])}
        </p>
      )}
      {status === 'loading' && (
        <div role="status" aria-label={t`Chargement…`}>
          <Skeleton width="100%" height="3rem" />
        </div>
      )}
      {status === 'locked' && (
        <LockedNotice
          title={room.owner ? t`Animer une séance avec Nova` : t`Participer à une séance de groupe`}
          reason={
            room.owner
              ? t`Lancer une séance, suivre ses manches et lire les notes de Nova est réservé à l’offre Pro. Le reste de la salle reste ouvert à tous.`
              : t`Tu peux suivre une séance gratuitement quand le propriétaire de la salle a l’offre Pro. Ce n’est pas le cas ici. Le reste de la salle reste ouvert à tous.`
          }
        />
      )}
      {status === 'none' &&
        (room.owner ? (
          <>
            <p {...stylex.props(shared.body)}>
              <Trans>Aucune séance en cours. Choisis un chapitre pour commencer.</Trans>
            </p>
            {startForm}
          </>
        ) : (
          waiting
        ))}
      {session && (
        <>
          <p {...stylex.props(styles.goal)}>
            <strong {...stylex.props(styles.label)}>
              <Trans>Objectif :</Trans>
            </strong>
            <span translate="no" {...stylex.props(shared.body)}>
              {serverText(session.goal)}
            </span>
          </p>
          <ol aria-label={t`Manches de la séance`} {...stylex.props(styles.rounds)}>
            {ROUNDS.map(([id, name], index) => {
              const current = id === session.round;
              const passed = index < reached;
              return (
                <li
                  key={id}
                  aria-current={current ? 'step' : undefined}
                  {...stylex.props(styles.round, current ? styles.current : passed ? styles.done : styles.upcoming)}>
                  {passed && <Icon name="check" size={16} />}
                  {i18n._(name)}
                </li>
              );
            })}
          </ol>
          {hint && session.round !== 'ended' && <p {...stylex.props(shared.muted)}>{i18n._(hint)}</p>}
          {(session.round === 'quiz' || session.round === 'ended') && (
            <RoomQuiz key={session.session_id} topic={session.topic} label={label} roomId={room.id} active={session.round === 'quiz'} />
          )}
          {session.round !== 'ended' && (
            <>
              <AskNova
                roomId={room.id}
                topic={session.topic}
                posts={state.posts}
                disabled={room.tutor_enabled === false}
                onStale={() => store.refresh()}
              />
              {plan === 'pro' && <Insights roomId={room.id} />}
              {plan === 'free' && (
                <LockedNotice
                  title={t`Tendances du groupe`}
                  reason={t`Les tendances du groupe et les avis sur les explications sont réservés à l’offre Pro. Le reste de la séance reste ouvert à tous.`}
                />
              )}
            </>
          )}
          {room.owner && session.round !== 'ended' && (
            <div {...stylex.props(shared.actions)}>
              <Button
                variant="primary"
                label={session.round === 'quiz' ? t`Terminer avec les notes de Nova` : t`Manche suivante`}
                isDisabled={busy}
                onClick={() => void run(session.round === 'quiz' ? 'notes' : 'next', () => store.next())}
              />
              <Button
                variant="secondary"
                label={t`Terminer la séance`}
                isDisabled={busy}
                onClick={() => void run('notes', () => store.end())}
              />
            </div>
          )}
          {session.round === 'ended' && (
            <>
              <h4 {...stylex.props(styles.label)}>
                <Trans>Notes de la séance</Trans>
              </h4>
              <ul {...stylex.props(styles.notes)}>
                {session.notes.map((note, index) => (
                  <li key={index} translate="no">
                    {note}
                  </li>
                ))}
              </ul>
              <h4 {...stylex.props(styles.label)}>
                <Trans>Mes points à revoir</Trans>
              </h4>
              {points.length === 0 ? (
                <EmptyNote>
                  <p {...stylex.props(shared.muted)}>
                    <Trans>Aucun point à revoir pour toi.</Trans>
                  </p>
                </EmptyNote>
              ) : (
                <ul {...stylex.props(styles.notes)}>
                  {points.map(point => (
                    <li key={point.id}>
                      <span {...stylex.props(styles.point)}>
                        <strong {...stylex.props(styles.pointVerdict)}>{i18n._(VERDICT_LABELS[point.verdict] ?? VERDICT_LABELS.unknown!)}</strong>
                        <span translate="no">{point.text}</span>
                        {point.review_action && (
                          <span {...stylex.props(styles.action)}>
                            <Trans>À faire :</Trans> <span translate="no">{point.review_action}</span>
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {room.owner ? (
                <>
                  <h4 {...stylex.props(styles.label)}>
                    <Trans>Nouvelle séance</Trans>
                  </h4>
                  {startForm}
                </>
              ) : (
                waiting
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
