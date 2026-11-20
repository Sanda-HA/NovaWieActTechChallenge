import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Selector} from '@astryxdesign/core/Selector';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Trans, useLingui} from '@lingui/react/macro';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {useSession} from '../../app/session';
import {mergePosts, type RoomPost} from '../../lib/room-session';
import type {ApiError} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Mascot} from '../../ui/Mascot';
import {EmptyNote} from '../../ui/EmptyNote';
import {Helpfulness} from './Helpfulness';
import {FORMAT_LABELS} from './Insights';
import {PAGE_SIZE, type ExplanationFormat, type RoomDetail, type RoomsStore} from './queries';
import {RoomCheck} from './RoomCheck';
import {VERDICT_LABELS} from './SessionPanel';
import {shared} from './styles';

const POST_MAX = 1000;
const FORMATS = Object.keys(FORMAT_LABELS) as ExplanationFormat[];
const NO_FORMAT = 'none';

const styles = stylex.create({
  list: {display: 'grid', gap: en.space3, margin: 0, padding: 0, listStyle: 'none', minInlineSize: 0},
  post: {
    display: 'grid',
    gap: en.space1,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
  },
  nova: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: en.space3,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderRadius: en.radiusLg,
    backgroundColor: en.faienceSoft,
    color: en.ink,
  },
  novaText: {display: 'grid', gap: en.space1, minInlineSize: 0},
  author: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, fontWeight: 700, overflowWrap: 'anywhere'},
  text: {margin: 0, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'},
  form: {display: 'grid', gap: en.space3, maxInlineSize: 720, minInlineSize: 0},
});

type Kind = 'explanation' | 'question';

export interface PostsProps {
  room: RoomDetail;
  rooms: RoomsStore;
  /** The posts the session poll brought back; they merge into what is already loaded. */
  polled: RoomPost[] | null;
  sessionActive: boolean;
  /** The learner chose to contribute to group insights, so peer helpfulness may be offered. */
  canRate: boolean;
  onPosted: () => void;
}

/** The room's posts: a composer, the newest page, and "Voir les messages précédents" for older ones. */
export function Posts({room, rooms, polled, sessionActive, canRate, onPosted}: PostsProps): React.JSX.Element {
  const {api, pseudo} = useSession();
  const {i18n, t} = useLingui();
  const path = `/groups/rooms/${room.id}/posts`;
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<Kind>('explanation');
  const [value, setValue] = useState('');
  const [format, setFormat] = useState<ExplanationFormat | typeof NO_FORMAT>(NO_FORMAT);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');

  const load = useCallback(
    () =>
      api.request<RoomPost[]>('GET', path).then(
        items => {
          setPosts(current => mergePosts(items, current));
          setHasOlder(items.length === PAGE_SIZE);
          setFailed(false);
        },
        (error: ApiError) => {
          if (error.status === 404) rooms.gone(room.id);
          else if (error.name !== 'AbortError') setFailed(true);
        },
      ),
    [api, path, rooms, room.id],
  );

  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (polled) setPosts(current => mergePosts(polled, current));
  }, [polled]);

  const loadOlder = () => {
    const oldest = posts.at(-1)?.id;
    return api.request<RoomPost[]>('GET', `${path}?before=${oldest}`).then(
      page => {
        setPosts(current => mergePosts(page, current));
        setHasOlder(page.length === PAGE_SIZE);
      },
      () => setFailed(true),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || state === 'busy') return;
    setState('busy');
    try {
      const post = await api.request<RoomPost>('POST', path, {json: kind === 'explanation' && format !== NO_FORMAT ? {kind, text, format} : {kind, text}});
      setValue('');
      setFormat(NO_FORMAT);
      setState('idle');
      setPosts(items => [post, ...items]);
      onPosted();
    } catch (error) {
      if ((error as ApiError).status === 404) rooms.gone(room.id);
      else if ((error as ApiError).name !== 'AbortError') setState('error');
    }
  };

  return (
    <section aria-label={t`Publications de la salle`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.kicker)}>
        <Trans>Publications de la salle</Trans>
      </h3>
      <form noValidate onSubmit={event => void submit(event)} {...stylex.props(styles.form)}>
        <RadioList label={t`Type de message`} value={kind} onChange={next => setKind(next === 'question' ? 'question' : 'explanation')}>
          <RadioListItem value="explanation" label={t`Explication`} description={t`Avec ton pseudo, visible par la salle.`} />
          <RadioListItem value="question" label={t`Question anonyme`} description={t`Aucun nom affiché.`} />
        </RadioList>
        {kind === 'explanation' && (
          <Selector
            label={t`Format de ton explication (facultatif)`}
            options={[{value: NO_FORMAT, label: t`Pas de format précisé`}, ...FORMATS.map(value => ({value, label: i18n._(FORMAT_LABELS[value])}))]}
            value={format}
            onChange={value => setFormat(value as ExplanationFormat | typeof NO_FORMAT)}
          />
        )}
        <TextArea label={t`Ton message pour la salle`} id="room-post" rows={3} htmlMaxLength={POST_MAX} value={value} onChange={setValue} />
        {!sessionActive && (
          <p {...stylex.props(shared.caption)}>
            <Trans>Nova ne lit tes messages que si tu l’as autorisé dans « Mes choix pour cette salle ».</Trans>
          </p>
        )}
        {state === 'busy' && (
          <p role="status" {...stylex.props(shared.caption)}>
            {t`Publication…`}
          </p>
        )}
        {state === 'error' && (
          <p role="alert" {...stylex.props(shared.body)}>
            <Trans>Impossible de publier dans la salle.</Trans>
          </p>
        )}
        <div {...stylex.props(shared.actions)}>
          <Button type="submit" variant="primary" label={t`Publier`} isDisabled={state === 'busy' || !value.trim()} />
        </div>
      </form>
      {kind === 'explanation' && <RoomCheck roomId={room.id} explanation={value} />}
      {failed && <ErrorBanner message={t`Les publications n’ont pas pu être chargées.`} onRetry={() => void load()} />}
      {posts.length === 0 ? (
        <EmptyNote>
          <p {...stylex.props(shared.muted)}>
            <Trans>Aucune publication pour le moment.</Trans>
          </p>
        </EmptyNote>
      ) : (
        <ul {...stylex.props(styles.list)}>
          {posts.map(post =>
            post.kind === 'prompt' || post.kind === 'tutor_reply' ? (
              <li key={post.id} {...stylex.props(styles.nova)}>
                <Mascot size={36} />
                <div {...stylex.props(styles.novaText)}>
                  <strong>Nova</strong>
                  <p {...stylex.props(styles.text)}>{post.text}</p>
                  {post.kind === 'tutor_reply' && (
                    <>
                      <p {...stylex.props(shared.caption)}>
                        <Trans>Réponse générée par l’IA : vérifie-la avec ton cours.</Trans>
                      </p>
                      {canRate && <Helpfulness roomId={room.id} postId={post.id} format={post.format} />}
                    </>
                  )}
                </div>
              </li>
            ) : (
              <li key={post.id} {...stylex.props(styles.post)}>
                <strong {...stylex.props(styles.author)}>
                  <span translate="no">{post.kind === 'question' ? t`Question anonyme` : post.author}</span>
                  {post.verdict && <Badge variant="neutral" label={i18n._(VERDICT_LABELS[post.verdict] ?? VERDICT_LABELS.unknown!)} />}
                </strong>
                <p {...stylex.props(styles.text)}>{post.text}</p>
                {canRate && post.kind === 'explanation' && post.author !== pseudo && <Helpfulness roomId={room.id} postId={post.id} format={post.format} />}
              </li>
            ),
          )}
        </ul>
      )}
      {hasOlder && (
        <div {...stylex.props(shared.actions)}>
          <Button variant="ghost" label={t`Voir les messages précédents`} onClick={() => void loadOlder()} />
        </div>
      )}
    </section>
  );
}
