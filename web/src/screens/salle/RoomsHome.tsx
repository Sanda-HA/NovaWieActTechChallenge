import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {plural} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useServerText} from '../../i18n/serverText';
import type {RoomsState} from '../../lib/rooms-store';
import {en} from '../../theme/ednova.stylex';
import {Directional} from '../../ui/Directional';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {Mascot} from '../../ui/Mascot';
import {CreateForm} from './CreateForm';
import {ExplanationCheck} from './ExplanationCheck';
import {JoinForm} from './JoinForm';
import type {RoomDetail, RoomsStore} from './queries';
import {shared} from './styles';

const styles = stylex.create({
  forms: {
    display: 'grid',
    gridTemplateColumns: {default: 'repeat(2, minmax(0, 1fr))', '@media (width < 720px)': 'minmax(0, 1fr)'},
    gap: en.space4,
    minInlineSize: 0,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space4,
    inlineSize: '100%',
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: {default: en.surface, ':hover': en.surfaceRaised},
    color: en.ink,
    fontFamily: en.fontText,
    textAlign: 'start',
    cursor: 'pointer',
    boxShadow: en.shadowRaise,
  },
  tile: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    inlineSize: '2.75rem',
    blockSize: '2.75rem',
    borderRadius: en.radiusTessera,
    backgroundColor: en.faience,
    color: en.onFaience,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  main: {display: 'grid', gap: en.space1, flexGrow: 1, minInlineSize: 0},
  name: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    overflowWrap: 'anywhere',
    fontSize: en.typeBodyLgSize,
    lineHeight: en.typeBodyLgLeading,
    fontWeight: 700,
  },
  meta: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `${en.space1} ${en.space3}`},
  count: {color: en.inkMuted, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  chevron: {display: 'inline-flex', flexShrink: 0, color: en.inkMuted},
  empty: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space4,
    minInlineSize: 0,
    padding: en.space4,
    borderRadius: en.radiusLg,
    backgroundColor: en.surfaceSunken,
  },
});

export interface RoomsHomeProps {
  snapshot: RoomsState;
  rooms: RoomsStore;
  pseudo: string | null;
  /** An invite code that could not be used: the join form shows it. */
  pendingCode: string;
  onOpen: (id: string) => void;
}

export function RoomsHome({snapshot, rooms, pseudo, pendingCode, onOpen}: RoomsHomeProps): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  const {status, busy, joinError} = snapshot;
  const list = snapshot.rooms as RoomDetail[];

  return (
    <>
      <section aria-label={t`Réviser à plusieurs`} {...stylex.props(shared.section)}>
        <p {...stylex.props(shared.muted)}>
          <Trans>Une salle réunit tes amis autour d’un chapitre. Nova anime la séance : explications, questions anonymes puis quiz.</Trans>
        </p>
        <div {...stylex.props(styles.forms)}>
          <CreateForm pseudo={pseudo} busy={busy} onCreate={name => rooms.create(name)} />
          <JoinForm busy={busy} joinError={joinError} initialCode={pendingCode} onJoin={code => rooms.join(code)} />
        </div>
      </section>

      <section aria-label={t`Mes salles`} {...stylex.props(shared.section)}>
        <h2 {...stylex.props(shared.h2)}>
          <Trans>Mes salles</Trans>
        </h2>
        {status === 'loading' ? (
          <div role="status" aria-label={t`Chargement…`}>
            <Skeleton width="100%" height="4.5rem" />
          </div>
        ) : status === 'error' ? (
          <ErrorBanner message={serverText(snapshot.error ?? 'Impossible de charger tes salles.')} onRetry={() => void rooms.load()} />
        ) : list.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <Mascot mood="peek" size={56} />
            <p {...stylex.props(shared.body)}>
              <Trans>Tu ne fais encore partie d’aucune salle.</Trans>
            </p>
          </div>
        ) : (
          <ul {...stylex.props(shared.list)}>
            {list.map(room => {
              const count = room.members.length;
              return (
                <li key={room.id}>
                  <button type="button" onClick={() => onOpen(room.id)} {...stylex.props(styles.item)}>
                    <span aria-hidden="true" {...stylex.props(styles.tile)}>
                      {Array.from(room.name.trim())[0] ?? '·'}
                    </span>
                    <span {...stylex.props(styles.main)}>
                      <strong translate="no" {...stylex.props(styles.name)}>
                        {room.name}
                      </strong>
                      <span {...stylex.props(styles.meta)}>
                        <span {...stylex.props(styles.count)}>{t`${plural(count, {one: '# membre', other: '# membres'})}`}</span>
                        {room.owner && <Badge variant="neutral" label={t`Tu es propriétaire`} />}
                        {room.session_round && room.session_round !== 'ended' && <Badge variant="success" label={t`Séance en cours`} />}
                      </span>
                    </span>
                    <span aria-hidden="true" {...stylex.props(styles.chevron)}>
                      <Directional>
                        <Icon name="chevron-right" size={20} />
                      </Directional>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ExplanationCheck />
    </>
  );
}
