import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {zodResolver} from '@hookform/resolvers/zod';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useServerText} from '../../i18n/serverText';
import {codeHint, codePattern, normalizeCode} from '../../lib/rooms-store';
import {CODE_LENGTH, joinRoomSchema, type JoinRoomValues} from './schema';
import {shared} from './styles';

export interface JoinFormProps {
  busy: boolean;
  /** The rooms store's own message, French. */
  joinError: string | null;
  /** An invite code that arrived with the link: shown here when it could not be used. */
  initialCode?: string;
  onJoin: (code: string) => unknown;
}

/** "Rejoindre avec un code": the room opens as soon as the 6 characters are valid. */
export function JoinForm({busy, joinError, initialCode = '', onJoin}: JoinFormProps): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  const form = useForm<JoinRoomValues>({resolver: zodResolver(joinRoomSchema), defaultValues: {code: initialCode}});
  const code = form.watch('code');
  useEffect(() => {
    if (initialCode) form.setValue('code', initialCode);
  }, [initialCode, form]);
  const submit = form.handleSubmit(values => void onJoin(values.code));

  return (
    <form noValidate onSubmit={submit} {...stylex.props(shared.card)}>
      <h3 {...stylex.props(shared.h2)}>
        <Trans>Rejoindre avec un code</Trans>
      </h3>
      <p {...stylex.props(shared.caption)}>
        <Trans>Saisis le code que ton ami t’a envoyé. La salle s’ouvre dès que les 6 caractères sont bons.</Trans>
      </p>
      <Controller
        control={form.control}
        name="code"
        render={({field}) => (
          <TextInput
            ref={field.ref}
            label={t`Code d’invitation`}
            htmlName="room-code"
            autoComplete="off"
            hasSpellCheck={false}
            description={joinError ? undefined : serverText(codeHint)}
            status={joinError ? {type: 'error', message: serverText(joinError)} : undefined}
            value={field.value}
            onChange={value => {
              const next = normalizeCode(value).slice(0, CODE_LENGTH);
              field.onChange(next);
              if (codePattern.test(next) && !busy) void onJoin(next);
            }}
            onBlur={field.onBlur}
          />
        )}
      />
      <div {...stylex.props(shared.actions)}>
        <Button type="submit" variant="secondary" label={busy ? t`Connexion à la salle…` : t`Rejoindre`} isDisabled={busy || !code} />
      </div>
    </form>
  );
}
