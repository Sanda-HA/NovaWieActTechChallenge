import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useState, type FormEvent} from 'react';
import {useSession, useStore, type Session} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {formatMinutes} from '../accueil/HomeOverview';
import {presets, type TimerState} from '../../lib/study-timer';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';

type Phase = TimerState['phase'];

export const PHASE_WORDS: Record<Phase, MessageDescriptor> = {
  idle: msg`Prêt`,
  running: msg`En cours`,
  paused: msg`En pause`,
  done: msg`Terminé`,
  break: msg`Repos`,
};

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 240;

/** A whole number of minutes from 1 to 240, or null. Mirrors what the store accepts. */
export function parseMinutes(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= MIN_MINUTES && value <= MAX_MINUTES ? value : null;
}

/** "24:59": the countdown rounds up, so it reads 00:00 only when time is really out. */
export function clock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Ticks every second while running or on a break, and closes the countdown at zero. */
export function useRemaining(timer: Session['timer'], phase: Phase): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (phase !== 'running' && phase !== 'break') return undefined;
    const handle = setInterval(() => {
      if (timer.remaining() <= 0) void timer.complete();
      setTick(value => value + 1);
    }, 1000);
    return () => clearInterval(handle);
  }, [timer, phase]);
  return timer.remaining();
}

const styles = stylex.create({
  controls: {display: 'grid', gap: en.space4, minInlineSize: 0},
  face: {display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: `0 ${en.space3}`, margin: 0},
  digits: {
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  digitsLarge: {
    fontSize: 'clamp(3.5rem, 2.5rem + 5vw, 5.5rem)',
    lineHeight: 1,
    fontWeight: en.typeDisplayWeight,
    letterSpacing: '-0.02em',
  },
  phase: {
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  presets: {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: en.space2},
  custom: {display: 'flex', alignItems: 'flex-end', gap: en.space2, minInlineSize: 0},
  customField: {inlineSize: '9.5rem'},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space2},
  error: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  bordered: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
  },
});

export interface TimerControlsProps {
  /** The big numerals of the Séances page; the floating panel keeps them small. */
  large?: boolean;
}

/** Face, durations, start/pause/reset and the store's failure message: shared by the page and the floating panel. */
export function TimerControls({large = false}: TimerControlsProps): React.JSX.Element {
  const {timer} = useSession();
  const state = useStore(timer);
  const remaining = useRemaining(timer, state.phase);
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const [custom, setCustom] = useState('');
  const [invalid, setInvalid] = useState(false);

  const {phase, busy, durationMs, error} = state;
  const editable = phase === 'idle' || phase === 'done';
  const chosen = Math.round(durationMs / 60000);
  const total = Math.ceil(remaining / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const spoken = t`${minutes} min ${seconds} s restantes`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseMinutes(custom);
    if (value === null) {
      setInvalid(true);
      return;
    }
    timer.setDuration(value);
    setCustom('');
    setInvalid(false);
  };

  return (
    <div {...stylex.props(styles.controls)}>
      <p {...stylex.props(styles.face)}>
        <span role="timer" aria-label={spoken} translate="no" {...stylex.props(styles.digits, large && styles.digitsLarge)}>
          {clock(remaining)}
        </span>
        <span {...stylex.props(styles.phase)}>{i18n._(PHASE_WORDS[phase])}</span>
      </p>
      {editable && (
        <div role="group" aria-label={t`Durée de la séance`} {...stylex.props(styles.presets)}>
          {presets.map(value => (
            <ToggleButton
              key={value}
              label={formatMinutes(value, i18n.locale)}
              isPressed={chosen === value}
              isDisabled={busy}
              onPressedChange={() => timer.setDuration(value)}
              xstyle={styles.bordered}
            />
          ))}
          <form onSubmit={submit} noValidate {...stylex.props(styles.custom)}>
            <TextInput
              label={t`Autre durée (min)`}
              htmlName="custom-minutes"
              autoComplete="off"
              width="9.5rem"
              isDisabled={busy}
              value={custom}
              onChange={value => {
                setCustom(value);
                setInvalid(false);
              }}
              status={invalid ? {type: 'error', message: t`Choisis une durée entre 1 et 240 minutes.`} : undefined}
            />
            <Button type="submit" size="sm" variant="secondary" label={t`OK`} isDisabled={busy || !custom} />
          </form>
        </div>
      )}
      <div {...stylex.props(styles.actions)}>
        {phase === 'running' ? (
          <Button
            variant="primary"
            label={t`Pause`}
            aria-label={t`Mettre la séance en pause`}
            isDisabled={busy}
            onClick={() => void timer.pause()}
          />
        ) : phase === 'break' ? (
          <Button variant="primary" label={t`Passer la pause`} isDisabled={busy} onClick={() => timer.skipBreak()} />
        ) : phase === 'done' ? (
          <>
            <Button variant="primary" label={t`Faire une pause (5 min)`} isDisabled={busy} onClick={() => timer.startBreak()} />
            <Button variant="secondary" label={t`Passer la pause`} isDisabled={busy} onClick={() => timer.skipBreak()} />
          </>
        ) : (
          <Button
            variant="primary"
            label={phase === 'paused' ? t`Reprendre` : t`Démarrer`}
            icon={<Icon name="play" size={20} />}
            isDisabled={busy}
            onClick={() => void timer.start()}
          />
        )}
        <Button
          variant="secondary"
          label={t`Réinitialiser`}
          aria-label={t`Réinitialiser le minuteur`}
          icon={<Icon name="refresh" size={20} />}
          isDisabled={busy || (editable && phase !== 'done')}
          onClick={() => void timer.reset()}
        />
      </div>
      {error && (
        <p role="alert" {...stylex.props(styles.error)}>
          {serverText(error)}
        </p>
      )}
    </div>
  );
}
