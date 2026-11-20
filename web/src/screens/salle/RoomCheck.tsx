import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useSession} from '../../app/session';
import {isProRequired} from '../../lib/plans';
import type {ApiError} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {LockedNotice} from '../plans/LockedNotice';
import {shared} from './styles';

type FallbackReason = 'pro_required' | 'consent_required' | 'raw_text_disabled' | 'agent_unavailable';

interface Checklist {
  checklist: string[];
  guiding_question?: string;
  verdict?: string;
  mode?: 'checklist' | 'ai';
  fallback_reason?: FallbackReason | null;
  summary?: string;
  point_feedback?: {point: string; status: 'missing'}[];
}

const FALLBACK: Record<FallbackReason, MessageDescriptor> = {
  pro_required: msg`La relecture par Nova est réservée à l’offre Pro.`,
  consent_required: msg`Active « Nova peut lire mes messages » dans tes choix pour que Nova relise ton texte.`,
  raw_text_disabled: msg`Le traitement du texte par l’IA est désactivé sur ce service.`,
  agent_unavailable: msg`Nova n’a pas pu relire ton texte à l’instant.`,
};

const styles = stylex.create({
  box: {
    display: 'grid',
    gap: en.space2,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
  },
  steps: {
    display: 'grid',
    gap: en.space1,
    margin: 0,
    paddingInlineStart: en.space5,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    overflowWrap: 'anywhere',
  },
});

/** Nova's read of one's own explanation when the room allows it, else a checklist to read it against. */
export function RoomCheck({roomId, explanation}: {roomId: string; explanation: string}): React.JSX.Element {
  const {api} = useSession();
  const {i18n, t} = useLingui();
  const [result, setResult] = useState<Checklist | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'locked' | 'error'>('idle');

  const run = async () => {
    setState('busy');
    try {
      setResult(await api.request<Checklist>('POST', `/groups/rooms/${roomId}/check`, {json: {explanation: explanation.trim().slice(0, 2000)}}));
      setState('idle');
    } catch (error) {
      if ((error as ApiError).name !== 'AbortError') setState(isProRequired(error) ? 'locked' : 'error');
    }
  };

  return (
    <div {...stylex.props(shared.section)}>
      <div {...stylex.props(shared.actions)}>
        <Button
          variant="ghost"
          label={t`Relire avec la liste de contrôle`}
          isDisabled={state === 'busy' || !explanation.trim()}
          onClick={() => void run()}
        />
      </div>
      {state === 'locked' && <LockedNotice title={t`Liste de contrôle de la séance`} />}
      {state === 'error' && (
        <p role="alert" {...stylex.props(shared.body)}>
          <Trans>La liste de contrôle est indisponible. Réessaie.</Trans>
        </p>
      )}
      {result?.mode === 'ai' && (
        <section aria-label={t`Relecture de Nova`} {...stylex.props(styles.box)}>
          <p translate="no" {...stylex.props(shared.body)}>
            {result.verdict === 'wellbeing' ? result.guiding_question : result.summary}
          </p>
          {result.point_feedback && result.point_feedback.length > 0 && (
            <>
              <p {...stylex.props(shared.caption)}>
                <Trans>Points du cours à ajouter :</Trans>
              </p>
              <ul translate="no" {...stylex.props(styles.steps)}>
                {result.point_feedback.map(item => (
                  <li key={item.point}>{item.point}</li>
                ))}
              </ul>
            </>
          )}
          <p {...stylex.props(shared.caption)}>
            <Trans>Relecture générée par l’IA : vérifie-la avec ton cours.</Trans>
          </p>
        </section>
      )}
      {result && result.mode !== 'ai' && result.checklist.length > 0 && (
        <section aria-label={t`Liste de contrôle`} {...stylex.props(styles.box)}>
          {result.fallback_reason && (
            <p role="status" {...stylex.props(shared.caption)}>
              {i18n._(FALLBACK[result.fallback_reason])}
            </p>
          )}
          <p {...stylex.props(shared.caption)}>
            <Trans>Relis ton explication point par point. Cette liste ne la note pas.</Trans>
          </p>
          <ol translate="no" {...stylex.props(styles.steps)}>
            {result.checklist.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {result.guiding_question && (
            <p translate="no" {...stylex.props(shared.body)}>
              {result.guiding_question}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
