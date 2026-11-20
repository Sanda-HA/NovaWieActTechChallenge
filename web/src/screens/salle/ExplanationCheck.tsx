import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {TextArea} from '@astryxdesign/core/TextArea';
import {zodResolver} from '@hookform/resolvers/zod';
import {Trans, useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useSession} from '../../app/session';
import type {ApiError} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {CheckCard, type CheckResult} from '../tuteur/CheckCard';
import {EXPLANATION_MAX, explanationSchema, type ExplanationValues} from './schema';
import {shared} from './styles';

const styles = stylex.create({
  form: {display: 'grid', gap: en.space3, maxInlineSize: 720, minInlineSize: 0},
  status: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  results: {display: 'grid', gap: en.space3, maxInlineSize: 720, minInlineSize: 0},
});

/** A private check of an explanation by Nova; nothing is shared with the room. */
export function ExplanationCheck(): React.JSX.Element {
  const {api} = useSession();
  const {t} = useLingui();
  const [verdict, setVerdict] = useState<CheckResult | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const form = useForm<ExplanationValues>({resolver: zodResolver(explanationSchema), defaultValues: {explanation: ''}});
  const draft = form.watch('explanation');

  const submit = form.handleSubmit(async ({explanation}) => {
    if (state === 'busy') return;
    setState('busy');
    try {
      setVerdict(await api.request<CheckResult>('POST', '/groups/demo/check', {json: {explanation: explanation.trim()}}));
      setState('idle');
    } catch (error) {
      if ((error as ApiError).name !== 'AbortError') setState('error');
    }
  });

  return (
    <section aria-label={t`Vérifier seul une explication`} {...stylex.props(shared.section)}>
      <h2 {...stylex.props(shared.h2)}>
        <Trans>Vérifier seul une explication</Trans>
      </h2>
      <p {...stylex.props(shared.muted)}>
        <Trans>Explique une notion avec tes propres mots pour recevoir un retour privé de Nova. Rien n’est partagé.</Trans>
      </p>
      {verdict && (
        <div {...stylex.props(styles.results)}>
          <CheckCard value={verdict} context="peer" />
        </div>
      )}
      {state === 'error' && (
        <p role="alert" {...stylex.props(shared.body)}>
          <Trans>Vérification indisponible.</Trans>
        </p>
      )}
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <Controller
          control={form.control}
          name="explanation"
          render={({field}) => (
            <TextArea
              ref={field.ref}
              id="explanation-draft"
              label={t`Ton explication`}
              rows={5}
              htmlMaxLength={EXPLANATION_MAX}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {state === 'busy' && (
          <p role="status" {...stylex.props(styles.status)}>
            <Trans>Nova vérifie ton explication…</Trans>
          </p>
        )}
        <div {...stylex.props(shared.actions)}>
          <Button
            type="submit"
            variant="secondary"
            label={t`Vérifier mon explication`}
            isDisabled={state === 'busy' || !draft.trim()}
          />
        </div>
      </form>
    </section>
  );
}
