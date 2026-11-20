import * as stylex from '@stylexjs/stylex';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Trans, useLingui} from '@lingui/react/macro';
import {useQueryClient} from '@tanstack/react-query';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSession, useStore} from '../../app/session';
import {
  createDuelDraft,
  formatClock,
  type DuelAnswer,
  type DuelDraft,
  type DuelView,
  type Exam,
  type ExamQuestion,
} from '../../lib/duel';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {MathText} from '../../ui/MathText';
import {shared} from '../salle/styles';
import {useReconnect} from './hooks';
import {DRAFT_ERRORS} from './messages';

const styles = stylex.create({
  page: {display: 'grid', gap: en.space4, minInlineSize: 0},
  bar: {
    position: 'sticky',
    insetBlockStart: 0,
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: `${en.space2} ${en.space4}`,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
  },
  timer: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  question: {display: 'grid', gap: en.space3, minInlineSize: 0, margin: 0, padding: en.space4, borderWidth: 1, borderStyle: 'solid', borderColor: en.line, borderRadius: en.radiusLg, backgroundColor: en.surface},
  unsaved: {borderStyle: 'dashed', borderColor: en.lineStrong},
  legend: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2, padding: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, fontWeight: 600},
  choices: {display: 'grid', gap: en.space2, minInlineSize: 0},
  choice: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space3,
    minInlineSize: 0,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    cursor: 'pointer',
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
  },
  choiceOn: {borderColor: en.faience, backgroundColor: en.faienceSoft},
  choiceDisabled: {cursor: 'not-allowed', opacity: 0.6},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space2, justifyContent: 'space-between'},
});

type Draft = ReturnType<typeof useDraft>;

function useDraft(roomId: string, duelId: string) {
  const {api} = useSession();
  const queryClient = useQueryClient();
  const draft = useMemo(() => createDuelDraft(api, roomId, duelId), [api, roomId, duelId]);
  const state = useStore(draft);
  useEffect(() => {
    void draft.load();
    return draft.stop;
  }, [draft]);
  // Back online, or the tab shown again: the duel and the draft are read again before the form is used.
  useReconnect(() => {
    void draft.reload();
    void queryClient.invalidateQueries({queryKey: ['duel', roomId, duelId]});
  });
  return {draft, state};
}

const answerKey = (answer: DuelAnswer | null | undefined) => (!answer ? '' : 'choice_id' in answer ? answer.choice_id : answer.value);

function ValueField({question, value, disabled, onCommit}: {question: ExamQuestion; value: string; disabled: boolean; onCommit: (answer: DuelAnswer | null) => void}) {
  const {t} = useLingui();
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (next: string) => {
    clearTimeout(timer.current);
    const trimmed = next.trim();
    if (trimmed !== value) onCommit(trimmed ? {value: trimmed.slice(0, 120)} : null);
  };
  return (
    <TextInput
      label={question.kind === 'number' ? t`Ta réponse (un nombre)` : t`Ta réponse`}
      htmlName={`answer-${question.id}`}
      autoComplete="off"
      hasSpellCheck={false}
      isDisabled={disabled}
      value={text}
      onChange={next => {
        setText(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(next), 600);
      }}
      onFocus={() => void (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        commit(text);
      }}
    />
  );
}

function Question({question, index, draft, state, disabled}: {question: ExamQuestion; index: number; draft: DuelDraft; state: Draft['state']; disabled: boolean}) {
  const {t} = useLingui();
  const pending = question.id in state.unsaved;
  const answer = pending ? state.unsaved[question.id] : state.confirmed[question.id];
  const selected = answerKey(answer);
  const points = question.points;
  return (
    <fieldset {...stylex.props(styles.question, pending && styles.unsaved)}>
      <legend {...stylex.props(styles.legend)}>
        <span>{t`Question ${index + 1}`}</span>
        <Badge variant="neutral" label={t`${points} pts`} />
        {pending ? <Badge variant="warning" label={t`Non enregistré`} /> : selected ? <Badge variant="success" label={t`Enregistré`} /> : null}
      </legend>
      <p {...stylex.props(shared.body)}>
        <MathText text={question.prompt} />
      </p>
      {question.kind === 'choice' ? (
        <div {...stylex.props(styles.choices)}>
          {question.choices.map(choice => {
            const on = selected === choice.id;
            return (
              <label key={choice.id} {...stylex.props(styles.choice, on && styles.choiceOn, disabled && styles.choiceDisabled)}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={on}
                  disabled={disabled}
                  onChange={() => draft.set(question.id, {choice_id: choice.id})}
                />
                <MathText text={choice.text} />
              </label>
            );
          })}
          {selected && !disabled && (
            <div>
              <Button variant="ghost" size="sm" label={t`Effacer ma réponse`} onClick={() => draft.set(question.id, null)} />
            </div>
          )}
        </div>
      ) : (
        <ValueField question={question} value={selected} disabled={disabled} onCommit={next => draft.set(question.id, next)} />
      )}
    </fieldset>
  );
}

export interface PlayProps {
  roomId: string;
  duelId: string;
  view: DuelView;
  exam: Exam;
  /** Time left before the deadline by the synchronised clock, in ms. */
  remaining: number;
  onConcede: () => void;
}

/** The exam: answers are saved one at a time as they are given, and handed in once the saves are done. */
export function Play({roomId, duelId, view, exam, remaining, onConcede}: PlayProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const {draft, state} = useDraft(roomId, duelId);
  const [confirming, setConfirming] = useState(false);
  const mine = view.players.find(player => player.slot === view.my_slot);
  const opponent = view.players.find(player => player.slot !== view.my_slot);
  const total = exam.questions.length;
  const handedIn = Boolean(state.submittedAt) || (mine !== undefined && mine.submission_state !== 'open');
  const timeUp = remaining <= 0;
  const disabled = handedIn || timeUp || state.submitting;
  const answered = exam.questions.filter(question => {
    const effective = question.id in state.unsaved ? state.unsaved[question.id] : state.confirmed[question.id];
    return Boolean(effective);
  }).length;
  const unsavedCount = Object.keys(state.unsaved).length;
  const opponentCount = opponent?.answered_count ?? 0;
  const opponentState = opponent?.submission_state ?? 'open';

  if (!state.loaded && !state.error) return <Skeleton width="100%" height="12rem" />;
  if (!state.loaded && state.error) return <ErrorBanner message={i18n._(DRAFT_ERRORS[state.error])} onRetry={() => void draft.load()} />;

  const save = state.saving ? t`Enregistrement…` : unsavedCount > 0 ? t`${unsavedCount} modification(s) non enregistrée(s)` : t`Tout est enregistré`;
  const retryable = state.error === 'network' || state.error === 'unavailable';
  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.bar)}>
        <p aria-label={t`Temps restant`} role="timer" {...stylex.props(styles.timer)}>
          {formatClock(remaining)}
        </p>
        <p role="status" {...stylex.props(shared.caption)}>
          {t`${answered} / ${total} réponses`} · {save}
        </p>
        <p {...stylex.props(shared.caption)}>
          {opponentState === 'submitted'
            ? t`Ton adversaire a rendu sa copie.`
            : opponentState === 'forfeit'
              ? t`Ton adversaire a abandonné.`
              : t`Adversaire : ${opponentCount} / ${total} réponses`}
        </p>
      </div>
      {state.error && (
        <ErrorBanner message={i18n._(DRAFT_ERRORS[state.error])} onRetry={retryable ? () => draft.retry() : undefined} />
      )}
      {handedIn ? (
        <p role="status" {...stylex.props(shared.body)}>
          <Trans>Ta copie est rendue. On attend ton adversaire ou la fin du temps.</Trans>
        </p>
      ) : timeUp ? (
        <p role="status" {...stylex.props(shared.body)}>
          <Trans>Le temps est écoulé. On enregistre le dernier état de ta copie…</Trans>
        </p>
      ) : null}
      {exam.questions.map((question, index) => (
        <Question key={question.id} question={question} index={index} draft={draft} state={state} disabled={disabled} />
      ))}
      {!handedIn && (
        <div {...stylex.props(styles.actions)}>
          <Button variant="destructive" label={t`Abandonner le duel`} isDisabled={state.submitting} onClick={onConcede} />
          <Button
            variant="primary"
            label={t`Rendre ma copie`}
            isLoading={state.submitting}
            isDisabled={timeUp || state.submitting}
            onClick={() => setConfirming(true)}
          />
        </div>
      )}
      <AlertDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title={t`Rendre ta copie ?`}
        description={answered < total ? t`Il te reste ${total - answered} question(s) sans réponse. Tu ne pourras plus modifier ta copie.` : t`Tu ne pourras plus modifier ta copie.`}
        actionLabel={t`Rendre ma copie`}
        cancelLabel={t`Continuer`}
        onAction={() => {
          setConfirming(false);
          void draft.submit();
        }}
      />
    </div>
  );
}
