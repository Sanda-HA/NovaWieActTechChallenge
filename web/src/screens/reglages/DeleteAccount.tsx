import * as stylex from '@stylexjs/stylex';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Trans, useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {useDeleteAccount} from './queries';
import {canDelete} from './schema';
import {styles} from './styles';

/** The pseudo is typed first, then an AlertDialog asks once more before DELETE /auth/me. */
export function DeleteAccount({pseudo}: {pseudo: string | null}): React.JSX.Element {
  const {t} = useLingui();
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const remove = useDeleteAccount();
  const busy = remove.isPending;
  const ready = canDelete(typed, pseudo, busy);
  const mismatch = typed !== '' && typed !== pseudo;

  return (
    <div {...stylex.props(styles.danger)}>
      <p {...stylex.props(styles.body)}>
        <Trans>Supprimer ton compte et les données qui lui sont associées. Cette action est définitive. Pour confirmer, recopie ton pseudo.</Trans>
      </p>
      {remove.isError && <ErrorBanner message={t`La suppression a échoué. Ton compte est conservé. Réessaie.`} />}
      <TextInput
        label={t`Confirme ton pseudo`}
        htmlName="confirm-pseudo"
        autoComplete="off"
        value={typed}
        onChange={setTyped}
        isDisabled={busy}
        status={mismatch ? {type: 'error', message: t`Recopie exactement ton pseudo.`} : undefined}
      />
      <div {...stylex.props(styles.actions)}>
        <Button variant="destructive" label={t`Supprimer mon compte`} icon={<Icon name="trash" size={20} />} isDisabled={!ready} onClick={() => setOpen(true)} />
      </div>
      <AlertDialog
        isOpen={open}
        onOpenChange={next => !busy && setOpen(next)}
        title={t`Supprimer ton compte ?`}
        description={t`Cette action est définitive : ton compte et tes données seront effacés.`}
        actionLabel={t`Supprimer définitivement`}
        actionVariant="destructive"
        cancelLabel={t`Annuler`}
        isActionLoading={busy}
        onAction={() => remove.mutate(undefined, {onSettled: () => setOpen(false)})}
      />
    </div>
  );
}
