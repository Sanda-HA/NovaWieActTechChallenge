import * as stylex from '@stylexjs/stylex';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import type {createRoomSession} from '../../lib/room-session';
import {en} from '../../theme/ednova.stylex';
import type {RoomDetail} from './queries';
import {shared} from './styles';

const styles = stylex.create({
  member: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${en.space2} ${en.space3}`,
    minInlineSize: 0,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
  },
  tile: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    inlineSize: '2rem',
    blockSize: '2rem',
    borderRadius: en.radiusTessera,
    fontFamily: en.fontDisplay,
    fontSize: en.typeLabelSize,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  online: {backgroundColor: en.masteryStrong, color: en.onFaience},
  away: {backgroundColor: en.surfaceSunken, color: en.inkMuted},
  who: {display: 'grid', flexGrow: 1, minInlineSize: 0},
  meta: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `${en.space1} ${en.space2}`},
  name: {
    flexGrow: 1,
    minInlineSize: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  presence: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  controls: {display: 'flex', flexWrap: 'wrap', gap: en.space1, flexBasis: '100%'},
});

type Pending = {action: 'remove' | 'owner'; member: string};

export interface MembersProps {
  room: RoomDetail;
  pseudo: string | null;
  store: ReturnType<typeof createRoomSession>;
  busy: boolean;
}

/** The members with their presence; the owner can remove one or hand the room over, after a confirmation. */
export function Members({room, pseudo, store, busy}: MembersProps): React.JSX.Element {
  const {t} = useLingui();
  const active = new Set(room.active_members ?? []);
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const count = room.members.length;

  const ask = (action: Pending['action'], member: string) => {
    setPending({action, member});
    setOpen(true);
  };
  const confirm = async () => {
    if (!pending) return;
    await (pending.action === 'remove' ? store.removeMember(pending.member) : store.transferOwner(pending.member));
    setOpen(false);
  };
  const member = pending?.member ?? '';
  const removing = pending?.action === 'remove';

  return (
    <section aria-label={t`Membres`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.kicker)}>{t`Membres (${count})`}</h3>
      <ul {...stylex.props(shared.list)}>
        {room.members.map(name => {
          const online = active.has(name);
          const manage = room.owner && name !== pseudo;
          return (
            <li key={name} {...stylex.props(styles.member)}>
              <span aria-hidden="true" {...stylex.props(styles.tile, online ? styles.online : styles.away)}>
                {Array.from(name)[0] ?? '·'}
              </span>
              <span {...stylex.props(styles.who)}>
                <span translate="no" {...stylex.props(styles.name)}>
                  {name}
                </span>
                <span {...stylex.props(styles.meta)}>
                  <span {...stylex.props(styles.presence)}>{online ? t`en ligne` : t`absent`}</span>
                  {name === pseudo && <span {...stylex.props(styles.presence)}>{t`(toi)`}</span>}
                  {name === room.owner_pseudo && <Badge variant="neutral" label={t`Propriétaire`} />}
                </span>
              </span>
              {manage && (
                <span {...stylex.props(styles.controls)}>
                  <Button size="sm" variant="ghost" label={t`Retirer`} aria-label={t`Retirer ${name}`} isDisabled={busy} onClick={() => ask('remove', name)} />
                  <Button
                    size="sm"
                    variant="ghost"
                    label={t`Nommer propriétaire`}
                    aria-label={t`Nommer ${name} propriétaire`}
                    isDisabled={busy}
                    onClick={() => ask('owner', name)}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <AlertDialog
        isOpen={open}
        onOpenChange={next => !busy && setOpen(next)}
        title={removing ? t`Retirer ${member} de la salle ?` : t`Nommer ${member} propriétaire ?`}
        description={removing ? t`Le code d’invitation va changer.` : t`Tu ne pourras plus gérer la salle.`}
        actionLabel={removing ? t`Confirmer le retrait` : t`Confirmer le transfert`}
        actionVariant={removing ? 'destructive' : 'primary'}
        cancelLabel={t`Annuler`}
        isActionLoading={busy}
        onAction={() => void confirm()}
      />
    </section>
  );
}
