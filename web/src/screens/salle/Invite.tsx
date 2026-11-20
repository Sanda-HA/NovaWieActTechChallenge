import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Trans, useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {inviteLink} from '../../lib/rooms-store';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';
import type {RoomDetail} from './queries';
import {shared} from './styles';

const styles = stylex.create({
  code: {
    display: 'block',
    padding: en.space3,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeTitleSize,
    lineHeight: en.typeTitleLeading,
    fontWeight: 700,
    letterSpacing: '0.24em',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
    userSelect: 'all',
    overflowWrap: 'anywhere',
  },
});

/** The room's invite code and link; the link is the real `#rejoindre=` form the app reads at load. */
export function Invite({room}: {room: RoomDetail}): React.JSX.Element {
  const {t} = useLingui();
  const [message, setMessage] = useState('');
  const link = inviteLink({origin: window.location.origin, pathname: '/'}, room.invite_code);
  const spoken = `${t`Code :`} ${room.invite_code.split('').join(' ')}`;

  const copy = async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(done);
    } catch {
      setMessage(t`Copie impossible : sélectionne le texte et copie-le toi-même.`);
    }
  };

  return (
    <section aria-label={t`Inviter des amis`} {...stylex.props(shared.card)}>
      <span {...stylex.props(shared.kicker)}>
        <Trans>Code d’invitation</Trans>
      </span>
      <code translate="no" aria-label={spoken} {...stylex.props(styles.code)}>
        {room.invite_code}
      </code>
      <div {...stylex.props(shared.actions)}>
        <Button
          variant="secondary"
          icon={<Icon name="copy" size={20} />}
          label={t`Copier le code`}
          onClick={() => void copy(room.invite_code, t`Code copié.`)}
        />
        <Button
          variant="ghost"
          icon={<Icon name="copy" size={20} />}
          label={t`Copier le lien`}
          onClick={() => void copy(link, t`Lien copié. Tes amis rejoignent la salle en l’ouvrant.`)}
        />
      </div>
      {message && (
        <p role="status" {...stylex.props(shared.caption)}>
          {message}
        </p>
      )}
    </section>
  );
}
