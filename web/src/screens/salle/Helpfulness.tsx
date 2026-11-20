import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useSession} from '../../app/session';
import type {ApiError} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {FORMAT_LABELS} from './Insights';
import type {ExplanationFormat} from './queries';
import {shared} from './styles';

const FORMATS = Object.keys(FORMAT_LABELS) as ExplanationFormat[];

const styles = stylex.create({
  panel: {display: 'grid', gap: en.space2, justifyItems: 'start', maxInlineSize: 320, minInlineSize: 0},
});

type State = 'idle' | 'saving' | 'saved' | 'own' | 'gone' | 'error';

/** A peer's judgement of one explanation, shared as a concept-level signal. Offered only to learners who opted in. */
export function Helpfulness({roomId, postId, format: known}: {roomId: string; postId: string; format?: ExplanationFormat | null}): React.JSX.Element {
  const {api} = useSession();
  const {i18n, t} = useLingui();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExplanationFormat>('step_by_step');
  const [state, setState] = useState<State>('idle');
  const [asked, setAsked] = useState(!known);

  const send = async (helpful: boolean) => {
    setState('saving');
    try {
      await api.request('PUT', `/groups/rooms/${roomId}/session/posts/${postId}/helpfulness`, {json: asked ? {helpful, format} : {helpful}});
      setState('saved');
    } catch (error) {
      const failure = error as ApiError;
      if (failure.name === 'AbortError') return;
      if (failure.status === 422 && failure.code === 'format_required') {
        setAsked(true);
        setState('idle');
        return;
      }
      setState(failure.code === 'cannot_rate_own_explanation' ? 'own' : failure.status === 404 ? 'gone' : 'error');
    }
  };

  if (state === 'saved') {
    return (
      <p role="status" {...stylex.props(shared.caption)}>
        {t`Merci, ton avis est enregistré.`}
      </p>
    );
  }
  if (!open) {
    return <Button variant="ghost" size="sm" label={t`Cette explication t’a-t-elle aidé ?`} onClick={() => setOpen(true)} />;
  }
  return (
    <div role="group" aria-label={t`Évaluer cette explication`} {...stylex.props(styles.panel)}>
      {asked && (
        <Selector
          label={t`Format de l’explication`}
          options={FORMATS.map(value => ({value, label: i18n._(FORMAT_LABELS[value])}))}
          value={format}
          isDisabled={state === 'saving'}
          onChange={value => setFormat(value as ExplanationFormat)}
        />
      )}
      <div {...stylex.props(shared.actions)}>
        <Button variant="secondary" size="sm" label={t`Utile`} isDisabled={state === 'saving'} onClick={() => void send(true)} />
        <Button variant="secondary" size="sm" label={t`Pas utile`} isDisabled={state === 'saving'} onClick={() => void send(false)} />
        <Button variant="ghost" size="sm" label={t`Annuler`} isDisabled={state === 'saving'} onClick={() => setOpen(false)} />
      </div>
      {state !== 'idle' && state !== 'saving' && (
        <p role="alert" {...stylex.props(shared.caption)}>
          {state === 'own'
            ? t`Tu ne peux pas évaluer ta propre explication.`
            : state === 'gone'
              ? t`Cette explication n’est plus dans la séance.`
              : t`Ton avis n’a pas pu être envoyé. Réessaie.`}
        </p>
      )}
    </div>
  );
}
