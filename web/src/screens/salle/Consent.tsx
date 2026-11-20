import * as stylex from '@stylexjs/stylex';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Switch} from '@astryxdesign/core/Switch';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {en} from '../../theme/ednova.stylex';
import {isProRequired} from '../../lib/plans';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {LockedNotice} from '../plans/LockedNotice';
import {CONSENT_KEYS, useRoomConsent, useUpdateConsent, type ConsentKey} from './queries';
import {shared} from './styles';

const CHOICES: Record<ConsentKey, {label: MessageDescriptor; detail: MessageDescriptor}> = {
  allow_ai_text: {
    label: msg`Nova peut lire mes messages`,
    detail: msg`Tes explications et questions éligibles peuvent être traitées pour aider la salle. Ton accord ne suffit pas : le service doit aussi avoir autorisé ce traitement du texte.`,
  },
  allow_solo_context: {
    label: msg`Nova peut tenir compte de mes préférences`,
    detail: msg`Ton niveau et ton format d’explication préféré, en termes généraux, peuvent orienter l’aide donnée au groupe.`,
  },
  allow_personalization: {
    label: msg`Suivi personnel après la séance`,
    detail: msg`Les notions à revoir pour toi sont gardées pour te proposer une révision privée, visible seulement par toi.`,
  },
  allow_group_insights: {
    label: msg`Contribuer aux tendances du groupe`,
    detail: msg`Ta participation peut compter dans les notions repérées pour la salle et te permet d’évaluer l’utilité d’une explication. Seules des notions sont partagées, jamais ton texte.`,
  },
};

const styles = stylex.create({
  list: {display: 'grid', gap: en.space4, margin: 0, padding: 0, listStyle: 'none', minInlineSize: 0},
});

/** The learner's four independent choices for this room. Always reachable: withdrawing consent is never behind a plan. */
export function Consent({roomId}: {roomId: string}): React.JSX.Element {
  const {i18n, t} = useLingui();
  const consent = useRoomConsent(roomId);
  const save = useUpdateConsent(roomId);
  const pending = save.isPending ? (Object.keys(save.variables)[0] as ConsentKey) : null;

  return (
    <section aria-label={t`Mes choix pour cette salle`} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.kicker)}>
        <Trans>Mes choix pour cette salle</Trans>
      </h3>
      <p {...stylex.props(shared.caption)}>
        <Trans>Chaque choix est indépendant et tu peux le retirer à tout moment. Refuser n’empêche pas de participer.</Trans>
      </p>
      {consent.isPending ? (
        <Skeleton width="100%" height="6rem" />
      ) : consent.isError || !consent.data ? (
        <ErrorBanner message={t`Tes choix n’ont pas pu être chargés.`} onRetry={() => void consent.refetch()} />
      ) : (
        <ul {...stylex.props(styles.list)}>
          {CONSENT_KEYS.map(key => (
            <li key={key}>
              <Switch
                label={i18n._(CHOICES[key].label)}
                description={i18n._(CHOICES[key].detail)}
                value={consent.data[key]}
                isLoading={pending === key}
                isDisabled={save.isPending}
                onChange={value => save.mutate({[key]: value})}
              />
              {key === 'allow_ai_text' && consent.data.raw_text_allowed === false && (
                <p role="note" {...stylex.props(shared.caption)}>
                  <Trans>Le traitement du texte par l’IA est désactivé sur ce service : ce choix n’a pas d’effet pour l’instant.</Trans>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {save.isError &&
        (isProRequired(save.error) ? (
          <LockedNotice
            title={t`Activer un choix pour Nova`}
            reason={t`Activer un choix est réservé à l’offre Pro. Tu peux toujours en retirer un.`}
          />
        ) : (
          <ErrorBanner message={t`Ton choix n’a pas pu être enregistré. Réessaie.`} />
        ))}
    </section>
  );
}
