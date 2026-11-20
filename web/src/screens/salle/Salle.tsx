import * as stylex from '@stylexjs/stylex';
import {Banner} from '@astryxdesign/core/Banner';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans} from '@lingui/react/macro';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import {useSession, useStore} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {createRoomsStore} from '../../lib/rooms-store';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {ScreenTitle} from '../ScreenTitle';
import type {RoomDetail} from './queries';
import {RoomPage} from './RoomPage';
import {RoomsHome} from './RoomsHome';

const styles = stylex.create({
  page: {display: 'grid', gap: {default: en.space8, '@media (width < 640px)': en.space6}, minInlineSize: 0},
  notices: {display: 'grid', gap: en.space3, minInlineSize: 0},
});

/**
 * `/salle` lists the learner's rooms, `/salle/:id` is one room. The rooms store owns the data and the busy state;
 * the URL says which room is open, and a room the store selects (created, joined) is opened in the URL.
 */
export function Component(): React.JSX.Element {
  const {api, pseudo} = useSession();
  const rooms = useMemo(() => createRoomsStore(api), [api]);
  const snapshot = useStore(rooms);
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const serverText = useServerText();
  const [pendingCode, setPendingCode] = useState('');
  const {status, selectedId, error, notice} = snapshot;
  const list = snapshot.rooms as RoomDetail[];
  const room = id ? list.find(item => item.id === id) : undefined;

  // An invite link that waited for sign-in: take the code only once the rooms are loaded, so the list cannot overwrite the join.
  useEffect(() => {
    let current = true;
    void rooms.load().then(() => {
      if (!current) return;
      const code = rooms.takePendingCode();
      if (!code) return;
      setPendingCode(code);
      void rooms.join(code);
    });
    return () => {
      current = false;
    };
  }, [rooms]);

  // The URL names a room the learner is not in (a stale link, a closed room): back to the list.
  // It reads the list when the URL or the load state changes, not on every poll.
  useEffect(() => {
    if (!id || status === 'loading') return;
    const known = list.find(item => item.id === id);
    if (!known) void navigate('/salle', {replace: true});
    else if (selectedId !== id) rooms.select(id);
  }, [id, status]);

  // The store opened or closed a room (created, joined, left, gone): follow it in the URL.
  const previous = useRef(selectedId);
  useEffect(() => {
    if (previous.current === selectedId) return;
    previous.current = selectedId;
    void navigate(selectedId ? `/salle/${selectedId}` : '/salle');
  }, [selectedId, navigate]);

  const back = () => {
    if (selectedId) rooms.select('');
    else void navigate('/salle');
  };
  const open = (roomId: string) => {
    if (selectedId === roomId) void navigate(`/salle/${roomId}`);
    else rooms.select(roomId);
  };

  return (
    <div {...stylex.props(styles.page)}>
      <ScreenTitle>
        <Trans>Salle d’étude</Trans>
      </ScreenTitle>
      {(notice || (error && status !== 'error')) && (
        <div {...stylex.props(styles.notices)}>
          {error && status !== 'error' && <ErrorBanner message={serverText(error)} />}
          {notice && <Banner status="success" role="status" title={serverText(notice)} />}
        </div>
      )}
      {room ? (
        <RoomPage key={room.id} room={room} rooms={rooms} pseudo={pseudo} busy={snapshot.busy} onBack={back} />
      ) : id && status === 'loading' ? (
        <Skeleton width="100%" height="12rem" />
      ) : (
        <RoomsHome snapshot={snapshot} rooms={rooms} pseudo={pseudo} pendingCode={pendingCode} onOpen={open} />
      )}
    </div>
  );
}
