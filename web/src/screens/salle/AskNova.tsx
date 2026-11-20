import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {CheckboxList, CheckboxListItem} from '@astryxdesign/core/CheckboxList';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Selector} from '@astryxdesign/core/Selector';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSession, useStore} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {createRoomTutor, type TutorErrorCode, type TutorKind} from '../../lib/room-tutor';
import type {RoomPost} from '../../lib/room-session';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {useTopicCatalog} from '../accueil/queries';
import {LockedNotice} from '../plans/LockedNotice';
import {shared} from './styles';

const NO_POST = 'none';
const MAX_CONCEPTS = 8;

const ERRORS: Record<TutorErrorCode, MessageDescriptor> = {
  disabled: msg`Nova a été désactivée dans cette salle. Ta place est gardée : tu peux continuer à étudier, publier et faire le quiz.`,
  duel: msg`Un duel est en cours dans la salle : Nova reprendra l’aide après le duel.`,
  throttled: msg`Nova a déjà beaucoup répondu à la salle. Réessaie dans un moment.`,
  pro_required: msg`Cette activité est réservée à l’offre Pro.`,
  source: msg`Ce message n’est plus disponible dans la séance. Choisis-en un autre ou demande sans message précis.`,
  concepts: msg`Une de ces notions n’est pas proposée pour ce chapitre. Décoche-les et réessaie.`,
  conflict: msg`Cette demande a changé : relance-la.`,
  busy: msg`Nova est très sollicitée. Réessaie dans quelques instants.`,
  failed: msg`Nova n’a pas pu répondre cette fois. Réessaie.`,
  cancelled: msg`La demande a été annulée, par exemple parce que les réglages de Nova ont changé. Réessaie si besoin.`,
  unavailable: msg`Nova est momentanément indisponible. Réessaie.`,
};

const styles = stylex.create({
  novaRow: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  form: {display: 'grid', gap: en.space3, maxInlineSize: 480, minInlineSize: 0},
});

const excerpt = (text: string) => (text.length > 60 ? `${text.slice(0, 59)}…` : text);

export interface AskNovaProps {
  roomId: string;
  /** The session's chapter. */
  topic: string;
  posts: RoomPost[] | null;
  /** The owner switched Nova off in the room settings. */
  disabled: boolean;
  /** Reads the room and its session again. */
  onStale: () => unknown;
}

/** Asks Nova, in the session, to explain or give a hint; the answer arrives in the room's posts as a Nova message. */
export function AskNova({roomId, topic, posts, disabled, onStale}: AskNovaProps): React.JSX.Element {
  const {api} = useSession();
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const stale = useRef(onStale);
  useEffect(() => void (stale.current = onStale), [onStale]);
  const tutor = useMemo(() => createRoomTutor(api, roomId, {onStale: () => stale.current(), onPost: () => stale.current()}), [api, roomId]);
  useEffect(() => tutor.stop, [tutor]);
  const {status, error, retryAfter} = useStore(tutor);
  const [kind, setKind] = useState<TutorKind>('explain');
  const [source, setSource] = useState(NO_POST);
  const [concepts, setConcepts] = useState<string[]>([]);

  const sources = (posts ?? []).filter(post => post.kind === 'explanation' || post.kind === 'question');
  const subtopics = (catalog.data?.subtopics ?? []).filter(sub => sub.parent === topic);
  const busy = status === 'sending' || status === 'waiting';
  // A message that left the feed since it was chosen must not block the ask: fall back to "no message".
  const chosen = sources.some(post => post.id === source) ? source : NO_POST;

  const send = () =>
    void tutor.ask({kind, sourcePostId: chosen === NO_POST ? null : Number(chosen), concepts: concepts.slice(0, MAX_CONCEPTS)});

  if (disabled) {
    return (
      <p role="note" {...stylex.props(shared.muted)}>
        <Trans>Nova est désactivée dans cette salle. Tu peux toujours étudier, publier et faire le quiz.</Trans>
      </p>
    );
  }

  const seconds = Math.ceil(retryAfter ?? 0);
  return (
    <section aria-label={t`Demander à Nova`} {...stylex.props(shared.section)}>
      <h4 {...stylex.props(shared.kicker)}>
        <Trans>Demander à Nova</Trans>
      </h4>
      <form
        noValidate
        onSubmit={event => {
          event.preventDefault();
          if (!busy) send();
        }}
        {...stylex.props(styles.form)}>
        <RadioList label={t`Ce que tu demandes`} value={kind} onChange={next => setKind(next === 'hint' ? 'hint' : 'explain')}>
          <RadioListItem value="explain" label={t`Une explication`} description={t`Nova reprend la notion pour le groupe.`} />
          <RadioListItem value="hint" label={t`Un indice`} description={t`Un coup de pouce, sans donner la réponse.`} />
        </RadioList>
        {sources.length > 0 && (
          <Selector
            label={t`À propos d’un message (facultatif)`}
            options={[
              {value: NO_POST, label: t`Aucun message en particulier`},
              ...sources.map(post => ({
                value: post.id,
                label: `${post.kind === 'question' ? t`Question anonyme` : (post.author ?? '')} : ${excerpt(post.text)}`,
              })),
            ]}
            value={chosen}
            isDisabled={busy}
            onChange={setSource}
          />
        )}
        {subtopics.length > 0 && (
          <CheckboxList label={t`Notions concernées (facultatif)`} value={concepts} isDisabled={busy} onChange={setConcepts}>
            {subtopics.map(sub => (
              <CheckboxListItem key={sub.slug} value={sub.slug} label={serverText(sub.label)} />
            ))}
          </CheckboxList>
        )}
        <div {...stylex.props(shared.actions)}>
          <Button type="submit" variant="secondary" label={t`Demander à Nova`} isDisabled={busy} isLoading={busy} />
        </div>
      </form>
      {busy && (
        <div {...stylex.props(styles.novaRow)}>
          <Mascot mood="thinking" size={44} />
          <p role="status" {...stylex.props(shared.caption)}>
            <Trans>Nova prépare sa réponse…</Trans>
          </p>
        </div>
      )}
      {status === 'done' && (
        <p role="status" {...stylex.props(shared.caption)}>
          <Trans>Nova a répondu : sa réponse est dans les publications de la salle.</Trans>
        </p>
      )}
      {status === 'failed' &&
        error &&
        (error === 'pro_required' ? (
          <LockedNotice title={t`Demander à Nova`} />
        ) : (
          <p role="alert" {...stylex.props(shared.body)}>
            {error === 'throttled' && seconds > 0 ? t`Nova est très sollicitée. Réessaie dans ${seconds} s.` : i18n._(ERRORS[error])}
          </p>
        ))}
    </section>
  );
}
