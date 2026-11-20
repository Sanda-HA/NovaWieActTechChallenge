import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSession, useStore} from '../../app/session';
import {formatClock} from '../../lib/duel';
import {createQuiz, type QuizError} from '../../lib/quiz';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {SourceChip} from '../../ui/SourceChip';
import {LockedNotice} from '../plans/LockedNotice';
import {ProMark} from '../plans/PlanBadge';
import {usePlan} from '../plans/queries';
import {QuizQuestion} from '../onboarding/QuizCard';
import {CheckCard} from '../tuteur/CheckCard';

const styles = stylex.create({
  novaRow: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  panel: {
    display: 'grid',
    gap: en.space5,
    minInlineSize: 0,
    maxInlineSize: 720,
    padding: {default: en.space6, '@media (width < 640px)': en.space4},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    overflowWrap: 'anywhere',
    outline: '0 none',
  },
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  score: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeTitleSize,
    lineHeight: en.typeTitleLeading,
    fontWeight: en.typeTitleWeight,
    outline: '0 none',
  },
  review: {display: 'grid', gap: en.space3, minInlineSize: 0, margin: 0},
  question: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading, fontWeight: 600},
  answer: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  source: {display: 'flex'},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space3},
  clock: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontVariantNumeric: 'tabular-nums',
    direction: 'ltr',
    unicodeBidi: 'isolate',
  },
  clockLow: {color: en.argileStrong},
  bar: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: en.space3},
});

const LOW_MS = 60_000;

/** The Bac practice countdown: digits stay left-to-right in Arabic, and the clock calls `onEnd` once at zero. */
function Countdown({deadline, onEnd}: {deadline: number; onEnd: () => void}): React.JSX.Element {
  const {t} = useLingui();
  const [left, setLeft] = useState(() => Math.max(0, deadline - Date.now()));
  const end = useRef(onEnd);
  useEffect(() => void (end.current = onEnd), [onEnd]);
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, deadline - Date.now());
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(handle);
        end.current();
      }
    };
    const handle = setInterval(tick, 250);
    tick();
    return () => clearInterval(handle);
  }, [deadline]);
  return (
    <p role="timer" aria-label={t`Temps restant`} {...stylex.props(styles.clock, left <= LOW_MS && styles.clockLow)}>
      {formatClock(left)}
    </p>
  );
}

const LANGUAGES = {fr: 'Français', en: 'English', ar: 'العربية'} as const;

export interface QuizPanelProps {
  /** The chapter's slug. */
  topic: string;
  /** Already translated. */
  label: string;
  /** The free sample quiz (a fixed derivatives question) instead of a Pro chapter quiz. */
  sample?: boolean;
  /** The quiz round of a group session: served by the room, not by the chapter. */
  roomId?: string;
  /** Timed Bac practice: a countdown that sends what is answered when it reaches zero. */
  timed?: boolean;
  canRestart?: boolean;
  onReview?: () => void;
  onClose: () => void;
}

function QuizFailure({error, title, onRetry}: {error: QuizError; title: string; onRetry?: () => void}) {
  const {t} = useLingui();
  if (error.code === 'pro_required') return <LockedNotice title={title} />;
  const seconds = Math.ceil(error.retryAfter ?? 0);
  const message =
    error.code === 'busy'
      ? seconds > 0
        ? t`Le quiz est très demandé. Réessaie dans ${seconds} s.`
        : t`Le quiz est très demandé. Réessaie dans quelques instants.`
      : error.code === 'not_in_course'
        ? t`Ce chapitre n'est pas encore dans le corpus vérifié.`
        : error.code === 'expired'
          ? t`Ce quiz a expiré. Recommence-le.`
          : error.code === 'quiz_round_inactive'
            ? t`La manche du quiz est terminée.`
          : t`Le quiz n’est pas disponible pour le moment. Réessaie.`;
  return (
    <>
      <p role="alert" {...stylex.props(styles.text)}>
        {message}
      </p>
      {onRetry && error.code !== 'not_in_course' && error.code !== 'quiz_round_inactive' && (
        <div {...stylex.props(styles.actions)}>
          <Button variant="secondary" label={t`Réessayer`} onClick={onRetry} />
        </div>
      )}
    </>
  );
}

/** The chapter quiz: one question at a time, then every verdict with the score. */
export function QuizPanel({topic, label, sample = false, roomId, timed = false, canRestart = true, onReview, onClose}: QuizPanelProps): React.JSX.Element {
  const {api} = useSession();
  const {t} = useLingui();
  const quiz = useMemo(() => createQuiz(api), [api]);
  const {plan} = usePlan();
  const {status, quiz: loaded, step, answers, result, error, deadline} = useStore(quiz);
  const [expired, setExpired] = useState(false);
  const source = useMemo(() => ({sample, roomId, timed}), [sample, roomId, timed]);
  const title = useRef<HTMLHeadingElement>(null);
  const score = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setExpired(false);
    let current = true;
    queueMicrotask(() => {
      if (current) void quiz.load(topic, source);
    });
    return () => {
      current = false;
      quiz.reset();
    };
  }, [quiz, topic, source]);

  useEffect(() => {
    title.current?.scrollIntoView?.({block: 'nearest'});
    title.current?.focus({preventScroll: true});
  }, [topic]);

  useEffect(() => {
    if (status === 'graded') score.current?.focus();
  }, [status]);

  const timeUp = () => {
    setExpired(true);
    void quiz.submit();
  };
  const retry = () => (loaded && error && error.code !== 'expired' ? void quiz.submit() : void quiz.load(topic, source));
  const question = loaded?.questions[step];
  let body: React.ReactNode;

  if (status === 'idle' || status === 'loading' || status === 'submitting') {
    body = (
      <div {...stylex.props(styles.novaRow)}>
        <Mascot mood="thinking" size={48} />
        <p role="status" {...stylex.props(styles.text)}>
          {status === 'submitting' && timed ? <Trans>Nova corrige ta copie…</Trans> : <Trans>Chargement…</Trans>}
        </p>
      </div>
    );
  } else if (status === 'failed' && error) {
    body = <QuizFailure error={error} title={sample ? t`Quiz d’exemple` : roomId ? t`Quiz de la séance` : timed ? t`Entraînement Bac` : t`Quiz du chapitre`} onRetry={canRestart || (loaded && error.code !== 'expired') ? retry : undefined} />;
  } else if (status === 'ready' && loaded && question) {
    body = (
      <>
        {timed && deadline !== null && (
          <div {...stylex.props(styles.bar)}>
            <Countdown deadline={deadline} onEnd={timeUp} />
            <p {...stylex.props(styles.text)}>
              <Trans>Les réponses non données comptent comme fausses.</Trans>
            </p>
          </div>
        )}
        <QuizQuestion
        key={question.id}
        step={step + 1}
        total={loaded.questions.length}
        question={question.question}
        choices={question.choices.map((choice, index) => ({id: String(index), label: choice}))}
        selected={answers[question.id] == null ? undefined : String(answers[question.id])}
        onSelect={id => quiz.select(question.id, Number(id))}
        onNext={step === loaded.questions.length - 1 ? () => void quiz.submit() : () => quiz.next()}
        />
      </>
    );
  } else if (status === 'graded' && loaded && result) {
    body = (
      <>
        <div {...stylex.props(styles.novaRow)}>
          <Mascot mood={result.score * (timed ? 5 : 2) >= result.total * (timed ? 4 : 1) ? 'cheer' : 'encourage'} size={64} />
          <h3 ref={score} tabIndex={-1} {...stylex.props(styles.score)}>
            <Trans>Score :</Trans> <span translate="no">{`${result.score} / ${result.total}`}</span>
          </h3>
        </div>
        {timed && expired && (
          <p role="status" {...stylex.props(styles.text)}>
            <Trans>Le temps est écoulé : ta copie a été envoyée telle quelle.</Trans>
          </p>
        )}
        {result.results.map(row => {
          const asked = loaded.questions.find(item => item.id === row.id);
          if (!asked) return null;
          return (
            <section key={row.id} aria-label={asked.question} {...stylex.props(styles.review)}>
              <p translate="no" {...stylex.props(styles.question)}>
                <MathText text={asked.question} />
              </p>
              <CheckCard
                context="attempt"
                value={{verdict: row.correct ? 'correct' : 'incorrect', issue: row.explanation || '', guiding_question: ''}}
              />
              {!row.correct && (
                <p {...stylex.props(styles.answer)}>
                  <Trans>Bonne réponse :</Trans> <MathText text={asked.choices[row.answer_index] ?? ''} />
                </p>
              )}
              {row.source?.page != null && (
                <div {...stylex.props(styles.source)}>
                  <SourceChip page={row.source.page} book={row.source.source} />
                </div>
              )}
            </section>
          );
        })}
        <div {...stylex.props(styles.actions)}>
          {!roomId && canRestart && (
            <Button variant="secondary" label={t`Refaire le quiz`} onClick={() => {
                setExpired(false);
                void quiz.load(topic, source);
              }}
            />
          )}
          {onReview && <Button variant="secondary" label={t`Ouvrir la fiche de révision`} onClick={onReview} />}
          <Button variant="primary" label={t`Fermer le quiz`} onClick={onClose} />
        </div>
      </>
    );
  }

  return (
    <section aria-label={sample ? t`Quiz d’exemple` : timed ? t`Entraînement Bac chronométré` : roomId ? t`Quiz de la séance` : t`Quiz du chapitre`} {...stylex.props(styles.panel)}>
      <h2 ref={title} tabIndex={-1} {...stylex.props(styles.title)}>
        {sample ? (
          <Trans>Quiz d’exemple</Trans>
        ) : timed ? (
          <>
            <Trans>Entraînement Bac :</Trans> <span translate="no">{label}</span>
          </>
        ) : (
          <>
            <Trans>Quiz du chapitre :</Trans> <span translate="no">{label}</span>
          </>
        )}
        {plan === 'free' && !sample && !roomId && <ProMark />}
      </h2>
      {roomId && loaded?.language && (
        <p {...stylex.props(styles.text)}>
          <Trans>Langue des questions :</Trans> <span translate="no">{LANGUAGES[loaded.language]}</span>
        </p>
      )}
      {body}
      {status !== 'graded' && (
        <div {...stylex.props(styles.actions)}>
          <Button variant="ghost" label={t`Fermer le quiz`} onClick={onClose} />
        </div>
      )}
    </section>
  );
}
