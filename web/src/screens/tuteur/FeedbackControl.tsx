import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';

export interface Feedback {
  helpful: boolean;
  reason?: string;
}

const REASONS: readonly {id: string; label: MessageDescriptor}[] = [
  {id: 'wrong', label: msg`C’est faux`},
  {id: 'unclear', label: msg`Pas clair`},
  {id: 'too_long', label: msg`Trop long`},
  {id: 'not_my_level', label: msg`Pas à mon niveau`},
  {id: 'other', label: msg`Autre`},
];

type Phase = 'idle' | 'reasons' | 'sending' | 'thanks' | 'failed';

const styles = stylex.create({
  group: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2, minInlineSize: 0},
  question: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  reasons: {display: 'flex', flexWrap: 'wrap', gap: en.space2, minInlineSize: 0, margin: 0, padding: 0},
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  failed: {color: en.harissa},
});

/**
 * "Utile ?" under an answer. A thumbs-up sends at once; a thumbs-down asks why first, with "Autre" last.
 * A failed send says so and can be tried again, instead of pretending it was noted.
 */
export function FeedbackControl({onSubmit}: {onSubmit: (value: Feedback) => Promise<void>}): React.JSX.Element {
  const {i18n, t} = useLingui();
  const [phase, setPhase] = useState<Phase>('idle');
  const [last, setLast] = useState<Feedback | null>(null);

  const send = async (value: Feedback) => {
    setLast(value);
    setPhase('sending');
    try {
      await onSubmit(value);
      setPhase('thanks');
    } catch {
      setPhase('failed');
    }
  };

  if (phase === 'thanks') {
    return (
      <p role="status" {...stylex.props(styles.status)}>
        <Icon name="check" size={16} />
        {t`Merci, c’est noté.`}
      </p>
    );
  }
  const busy = phase === 'sending';
  return (
    <div role="group" aria-label={t`Cette réponse t’a aidé ?`} {...stylex.props(styles.group)}>
      <span {...stylex.props(styles.question)}>{t`Utile ?`}</span>
      <Button
        variant="secondary"
        size="sm"
        isIconOnly
        icon={<Icon name="thumb-up" size={16} />}
        label={t`Oui, utile`}
        isDisabled={busy}
        onClick={() => void send({helpful: true})}
      />
      <Button
        variant="secondary"
        size="sm"
        isIconOnly
        icon={<Icon name="thumb-down" size={16} />}
        label={t`Non, pas utile`}
        aria-expanded={phase === 'reasons'}
        isDisabled={busy}
        onClick={() => setPhase(phase === 'reasons' ? 'idle' : 'reasons')}
      />
      {phase === 'reasons' && (
        <div role="group" aria-label={t`Pourquoi ?`} {...stylex.props(styles.reasons)}>
          {REASONS.map(reason => (
            <Button key={reason.id} variant="secondary" size="sm" label={i18n._(reason.label)} onClick={() => void send({helpful: false, reason: reason.id})} />
          ))}
        </div>
      )}
      {phase === 'failed' && (
        <p role="alert" {...stylex.props(styles.status, styles.failed)}>
          {t`Avis non envoyé.`}
          <Button variant="secondary" size="sm" label={t`Réessayer`} onClick={() => last && void send(last)} />
        </p>
      )}
    </div>
  );
}
