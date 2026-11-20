import * as stylex from '@stylexjs/stylex';
import {Switch} from '@astryxdesign/core/Switch';
import {Trans, useLingui} from '@lingui/react/macro';
import {isProRequired} from '../../lib/plans';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {LockedNotice} from '../plans/LockedNotice';
import {usePlan} from '../plans/queries';
import {useUpdateSettings, type RoomDetail, type RoomsStore} from './queries';
import {shared} from './styles';

const styles = stylex.create({
  list: {display: 'grid', gap: en.space4, margin: 0, padding: 0, listStyle: 'none', minInlineSize: 0},
});

/**
 * Nova in this room. The owner decides whether Nova helps and whether it opens rounds on its own; everyone else
 * only reads the result. Studying, posting and the quiz do not depend on it.
 */
export function RoomSettings({room, rooms}: {room: RoomDetail; rooms: RoomsStore}): React.JSX.Element {
  const {t} = useLingui();
  const {plan} = usePlan();
  const save = useUpdateSettings(room.id);
  const enabled = room.tutor_enabled !== false;
  const prompts = room.tutor_round_prompts === true;

  const change = (patch: {tutor_enabled?: boolean; tutor_round_prompts?: boolean}) =>
    save.mutate(patch, {onSuccess: updated => rooms.update(updated)});

  return (
    <section aria-label={t`Nova dans la salle`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.kicker)}>
        <Trans>Nova dans la salle</Trans>
      </h3>
      {!room.owner ? (
        <>
          <p {...stylex.props(shared.body)}>
            {enabled ? t`Nova peut répondre aux demandes de la salle pendant une séance.` : t`Le propriétaire a désactivé Nova dans cette salle.`}
          </p>
          <p {...stylex.props(shared.caption)}>
            <Trans>Les publications, les séances et le quiz restent disponibles dans les deux cas.</Trans>
          </p>
        </>
      ) : plan === 'free' || (save.isError && isProRequired(save.error)) ? (
        <LockedNotice
          title={t`Régler Nova pour la salle`}
          reason={t`Activer ou désactiver Nova et ses relances automatiques est réservé à l’offre Pro. Le reste de la salle reste ouvert à tous.`}
        />
      ) : (
        <>
          <ul {...stylex.props(styles.list)}>
            <li>
              <Switch
                label={t`Nova aide la salle`}
                description={t`Les membres peuvent demander une explication ou un indice à Nova pendant une séance.`}
                value={enabled}
                isDisabled={save.isPending || plan === null}
                onChange={value => change({tutor_enabled: value})}
              />
            </li>
            <li>
              <Switch
                label={t`Relances automatiques à chaque manche`}
                description={t`Nova peut proposer une relance à la fin d’une manche et un résumé en fin de séance.`}
                value={prompts}
                isDisabled={save.isPending || !enabled || plan === null}
                disabledMessage={enabled ? undefined : t`Active d’abord Nova pour la salle.`}
                onChange={value => change({tutor_round_prompts: value})}
              />
            </li>
          </ul>
          <p {...stylex.props(shared.caption)}>
            <Trans>Désactiver Nova ne bloque ni les publications, ni les séances, ni le quiz de la salle.</Trans>
          </p>
          {save.isError && !isProRequired(save.error) && <ErrorBanner message={t`Les réglages n’ont pas pu être enregistrés. Réessaie.`} />}
        </>
      )}
    </section>
  );
}
