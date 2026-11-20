import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {InputGroup} from '@astryxdesign/core/InputGroup';
import {TextInput} from '@astryxdesign/core/TextInput';
import {zodResolver} from '@hookform/resolvers/zod';
import {useLingui} from '@lingui/react/macro';
import {useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';
import {useSession} from '../../app/session';
import {signIn} from '../../lib/api';
import {setLocale} from '../../lib/i18n-store';
import type {ApiError, Profile} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';
import {useOnboarding} from './state';
import {accountSchema, type AccountValues} from './schema';
import {NextArrow, StepActions, StepFrame} from './StepFrame';

const styles = stylex.create({
  form: {display: 'grid', gap: en.space5, maxInlineSize: 560},
  fields: {display: 'grid', gap: en.space5},
  privacy: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: en.space2,
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  lock: {display: 'inline-flex', flexShrink: 0, paddingBlockStart: 1},
  switch: {justifySelf: 'start'},
});

export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const navigate = useNavigate();
  const {api, signedIn} = useSession();
  const {wantsLogin, pseudo, patch} = useOnboarding();
  const [login, setLogin] = useState(wantsLogin);
  const [created, setCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AccountValues>({resolver: zodResolver(accountSchema), defaultValues: {username: pseudo, password: ''}});
  const {errors, isSubmitting} = form.formState;
  const authenticated = useRef(false);
  const createdHere = useRef(false);

  const message = (code: string | undefined): string | undefined =>
    code === 'pseudo'
      ? t`3 à 30 caractères : lettres et chiffres.`
      : code === 'password'
        ? t`8 caractères minimum : ajoute quelques lettres ou chiffres.`
        : code;

  const submit = form.handleSubmit(async ({username, password}) => {
    const name = username.trim();
    try {
      if (!authenticated.current) {
        await signIn(api, {
          login: login || createdHere.current,
          username: name,
          password,
          onCreated: () => {
            createdHere.current = true;
            setCreated(true);
          },
        });
        authenticated.current = true;
      }
      if (login) setLocale((await api.request<Profile>('GET', '/me/profile')).reply_language);
      form.resetField('password');
      patch({pseudo: name});
      signedIn(name, {onboarding: !login});
      void navigate(login ? '/accueil' : '/bac');
    } catch (error) {
      if ((error as ApiError).status === 409) {
        form.setError('username', {message: t`Ce pseudo est déjà pris.`});
      } else {
        form.setError('password', {message: createdHere.current ? t`Compte créé. Réessaie pour continuer.` : t`Connexion indisponible. Réessaie.`});
      }
    }
  });

  const toggleLogin = () => {
    setLogin(!login);
    form.clearErrors();
  };

  const asLogin = login || created;
  const submitLabel = isSubmitting ? (asLogin ? t`Connexion…` : t`Création…`) : asLogin ? t`Me connecter` : t`Créer mon compte`;
  const usernameError = message(errors.username?.message);
  const passwordError = message(errors.password?.message);

  return (
    <StepFrame
      mascot="idle"
      title={login ? t`Content de te revoir.` : t`Choisis un pseudo. Pas besoin de ton vrai nom.`}
      sub={login ? t`Ton espace t’attend là où tu l’as laissé.` : t`L'historique de tes échanges n'est pas enregistré dans ton compte.`}>
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <div {...stylex.props(styles.fields)}>
          <Controller
            control={form.control}
            name="username"
            render={({field}) => (
              <TextInput
                ref={field.ref}
                label={t`Pseudo`}
                htmlName="username"
                autoComplete="username"
                hasSpellCheck={false}
                placeholder={t`ex. yasmine07…`}
                description={login || usernameError ? undefined : t`3 à 30 caractères : lettres et chiffres.`}
                status={usernameError ? {type: 'error', message: usernameError} : undefined}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({field}) => (
              <InputGroup
                label={t`Mot de passe`}
                description={login || passwordError ? undefined : t`8 caractères minimum.`}
                status={passwordError ? {type: 'error', message: passwordError} : undefined}>
                <TextInput
                  ref={field.ref}
                  label={t`Mot de passe`}
                  isLabelHidden
                  htmlName="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={login ? 'current-password' : 'new-password'}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
                <Button
                  variant="secondary"
                  isIconOnly
                  label={showPassword ? t`Masquer le mot de passe` : t`Afficher le mot de passe`}
                  aria-pressed={showPassword}
                  icon={<Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />}
                  onClick={() => setShowPassword(shown => !shown)}
                />
              </InputGroup>
            )}
          />
        </div>
        <p {...stylex.props(styles.privacy)}>
          <span aria-hidden="true" {...stylex.props(styles.lock)}>
            <Icon name="lock" size={16} />
          </span>
          <span>{t`Pas d’e-mail, pas de numéro de téléphone. Tu peux supprimer ton compte et toutes tes données à tout moment.`}</span>
        </p>
        <div {...stylex.props(styles.switch)}>
          <Button variant="ghost" size="sm" label={login ? t`Je n’ai pas encore de compte` : t`J’ai déjà un compte`} onClick={toggleLogin} />
        </div>
        <StepActions onBack={() => void navigate('/bienvenue')}>
          <Button type="submit" variant="primary" size="lg" label={submitLabel} isLoading={isSubmitting} endContent={<NextArrow />} />
        </StepActions>
      </form>
    </StepFrame>
  );
}
