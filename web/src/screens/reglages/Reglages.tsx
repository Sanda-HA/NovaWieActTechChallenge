import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {TextInput} from '@astryxdesign/core/TextInput';
import type {ThemeMode} from '@astryxdesign/core/theme';
import {zodResolver} from '@hookform/resolvers/zod';
import {Trans, useLingui} from '@lingui/react/macro';
import type {ReactNode} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useSession, useStore} from '../../app/session';
import {themeMode} from '../../app/themeMode';
import {ChoiceCard} from '../../ui/ChoiceCard';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {useProfile, type HomeProfile} from '../accueil/queries';
import {PlansSection} from '../plans/PlansSection';
import {ScreenTitle} from '../ScreenTitle';
import {DeleteAccount} from './DeleteAccount';
import {useSaveSettings} from './queries';
import {CITY_MAX, settingsSchema, type SettingsValues} from './schema';
import {styles} from './styles';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const SECTIONS = ['mathematiques', 'sciences_experimentales', 'autre'] as const;
const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

const toValues = (profile: HomeProfile): SettingsValues => ({
  city: profile.city ?? '',
  subjects: (profile.subjects ?? []).join(', '),
  level: profile.level ?? 'beginner',
  section: profile.section ?? '',
  reply_language: profile.reply_language === 'en' || profile.reply_language === 'ar' ? profile.reply_language : 'fr',
  presentation: profile.presentation ?? null,
  enabled_tools: profile.enabled_tools ?? [],
});

function Block({title, note, children}: {title: string; note?: string; children: ReactNode}): React.JSX.Element {
  return (
    <section aria-label={title} {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.danger)}>
        <h2 {...stylex.props(styles.h2)}>{title}</h2>
        {note && <p {...stylex.props(styles.caption)}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

function SettingsForm({profile}: {profile: HomeProfile}): React.JSX.Element {
  const {t} = useLingui();
  const {pseudo, signOut} = useSession();
  const mode = useStore(themeMode);
  const save = useSaveSettings();
  const form = useForm<SettingsValues>({resolver: zodResolver(settingsSchema), defaultValues: toValues(profile)});
  const {level, section, reply_language: language, presentation, enabled_tools: tools} = form.watch();
  const pick = <K extends keyof SettingsValues>(field: K, value: SettingsValues[K]) =>
    form.setValue(field, value as never, {shouldDirty: true});
  const toggleTool = (tool: string, on: boolean) =>
    pick('enabled_tools', on ? [...tools.filter(item => item !== tool), tool] : tools.filter(item => item !== tool));
  const submit = form.handleSubmit(values => save.mutate(values));

  const levelTitle: Record<(typeof LEVELS)[number], string> = {
    beginner: t`Débutant`,
    intermediate: t`Intermédiaire`,
    advanced: t`Avancé`,
  };
  const sectionTitle: Record<(typeof SECTIONS)[number], string> = {
    mathematiques: t`Mathématiques`,
    sciences_experimentales: t`Sciences expérimentales`,
    autre: t`Autre section`,
  };
  const modeLabel: Record<string, string> = {light: t`Jour`, dark: t`Nuit`, system: t`Système`};

  return (
    <>
      <PlansSection />
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        {save.isError && <ErrorBanner message={t`Les réglages n’ont pas pu être enregistrés. Tes saisies sont conservées.`} onRetry={() => void submit()} />}

        <Block title={t`Compte élève`}>
          <TextInput label={t`Pseudo`} htmlName="pseudo" value={pseudo ?? ''} isReadOnly />
        </Block>

        <Block title={t`Profil facultatif`} note={t`Ces informations peuvent être laissées vides.`}>
          <Controller
            control={form.control}
            name="city"
            render={({field, fieldState}) => (
              <TextInput
                ref={field.ref}
                label={t`Ville (facultatif)`}
                description={t`50 caractères maximum.`}
                htmlName="city"
                autoComplete="address-level2"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                status={fieldState.error || field.value.trim().length > CITY_MAX ? {type: 'error', message: t`50 caractères maximum.`} : undefined}
              />
            )}
          />
          <Controller
            control={form.control}
            name="subjects"
            render={({field}) => (
              <TextInput
                ref={field.ref}
                label={t`Matières (facultatif)`}
                description={t`Sépare les matières par une virgule.`}
                htmlName="subjects"
                autoComplete="off"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <div role="radiogroup" aria-label={t`Niveau (facultatif)`} {...stylex.props(styles.grid3)}>
            {LEVELS.map(value => (
              <ChoiceCard key={value} type="radio" name="level" title={levelTitle[value]} checked={level === value} onChange={() => pick('level', value)} />
            ))}
          </div>
        </Block>

        <Block title={t`Section du bac`}>
          <div role="radiogroup" aria-label={t`Section du bac`} {...stylex.props(styles.grid3)}>
            {SECTIONS.map(value => (
              <ChoiceCard key={value} type="radio" name="section" title={sectionTitle[value]} checked={section === value} onChange={() => pick('section', value)} />
            ))}
          </div>
        </Block>

        <Block title={t`Langue des réponses`}>
          <div role="radiogroup" aria-label={t`Langue des réponses`} {...stylex.props(styles.grid3)}>
            <ChoiceCard type="radio" name="reply-language" title="Français" checked={language === 'fr'} onChange={() => pick('reply_language', 'fr')} />
            <ChoiceCard type="radio" name="reply-language" title="English" checked={language === 'en'} onChange={() => pick('reply_language', 'en')} />
            <ChoiceCard type="radio" name="reply-language" title="العربية" checked={language === 'ar'} onChange={() => pick('reply_language', 'ar')} />
          </div>
        </Block>

        <Block title={t`Présentation`}>
          <div role="radiogroup" aria-label={t`Présentation`} {...stylex.props(styles.grid3)}>
            <ChoiceCard type="radio" name="presentation" icon="tesserae" title={t`Visuel`} checked={presentation === 'visual'} onChange={() => pick('presentation', 'visual')} />
            <ChoiceCard type="radio" name="presentation" icon="book" title={t`Lecture`} checked={presentation === 'reading'} onChange={() => pick('presentation', 'reading')} />
            <ChoiceCard type="radio" name="presentation" title={t`Selon le diagnostic`} checked={presentation === null} onChange={() => pick('presentation', null)} />
          </div>
        </Block>

        <Block title={t`Raccourcis sur l’accueil`}>
          <div role="group" aria-label={t`Raccourcis sur l’accueil`} {...stylex.props(styles.grid2)}>
            <ChoiceCard type="checkbox" icon="stairs" title={t`Exercices guidés`} checked={tools.includes('guided')} onChange={on => toggleTool('guided', on)} />
            <ChoiceCard type="checkbox" icon="review" title={t`Vérifier une explication`} checked={tools.includes('feynman')} onChange={on => toggleTool('feynman', on)} />
          </div>
        </Block>

        <div {...stylex.props(styles.actions)}>
          <Button type="submit" variant="primary" label={t`Enregistrer`} isLoading={save.isPending} />
          {save.isSuccess && (
            <p role="status" {...stylex.props(styles.saved)}>
              <Icon name="check" size={16} />
              <Trans>Réglages enregistrés.</Trans>
            </p>
          )}
        </div>
      </form>

      <Block title={t`Apparence`}>
        <SegmentedControl label={t`Apparence`} value={mode} onChange={value => themeMode.set(value as ThemeMode)}>
          {THEME_MODES.map(value => (
            <SegmentedControlItem key={value} value={value} label={modeLabel[value] ?? value} />
          ))}
        </SegmentedControl>
      </Block>

      <Block title={t`Confidentialité`} note={t`L'historique de tes échanges n'est pas enregistré dans ton compte.`}>
        <div {...stylex.props(styles.actions)}>
          <Button variant="secondary" label={t`Se déconnecter`} onClick={signOut} />
        </div>
        <DeleteAccount pseudo={pseudo} />
      </Block>
    </>
  );
}

export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const profile = useProfile();
  return (
    <div {...stylex.props(styles.page)}>
      <ScreenTitle>
        <Trans>Réglages</Trans>
      </ScreenTitle>
      {profile.isError && <ErrorBanner message={t`Chargement indisponible. Réessaie.`} onRetry={() => void profile.refetch()} />}
      {profile.data ? <SettingsForm profile={profile.data} /> : !profile.isError && <Skeleton width="100%" height="12rem" />}
    </div>
  );
}
