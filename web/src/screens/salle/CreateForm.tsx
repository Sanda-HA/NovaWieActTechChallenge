import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {zodResolver} from '@hookform/resolvers/zod';
import {Trans, useLingui} from '@lingui/react/macro';
import {Controller, useForm} from 'react-hook-form';
import {ROOM_NAME_MAX, createRoomSchema, type CreateRoomValues} from './schema';
import {shared} from './styles';

export interface CreateFormProps {
  pseudo: string | null;
  busy: boolean;
  onCreate: (name: string) => unknown;
}

/** "Créer une salle": the learner becomes its owner. */
export function CreateForm({pseudo, busy, onCreate}: CreateFormProps): React.JSX.Element {
  const {t} = useLingui();
  const owner = pseudo ?? '';
  const initial = owner ? t`Salle de ${owner}` : '';
  const form = useForm<CreateRoomValues>({resolver: zodResolver(createRoomSchema), defaultValues: {name: initial}});
  const name = form.watch('name');
  const submit = form.handleSubmit(values => void onCreate(values.name));

  return (
    <form noValidate onSubmit={submit} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.h2)}>
        <Trans>Créer une salle</Trans>
      </h3>
      <p {...stylex.props(shared.caption)}>
        <Trans>Tu deviens propriétaire et tu peux inviter tes amis.</Trans>
      </p>
      <Controller
        control={form.control}
        name="name"
        render={({field}) => (
          <TextInput
            ref={field.ref}
            label={t`Nom de la salle`}
            htmlName="room-name"
            autoComplete="off"
            value={field.value}
            onChange={value => field.onChange(value.slice(0, ROOM_NAME_MAX))}
            onBlur={field.onBlur}
          />
        )}
      />
      <div {...stylex.props(shared.actions)}>
        <Button type="submit" variant="primary" label={t`Créer la salle`} isDisabled={busy || !name.trim()} />
      </div>
    </form>
  );
}
