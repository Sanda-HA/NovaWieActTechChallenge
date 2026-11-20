import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {Trans, useLingui} from '@lingui/react/macro';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useId, useRef, useState} from 'react';
import {useSession} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {intlLocale} from '../../lib/i18n-store';
import {isProRequired} from '../../lib/plans';
import type {ApiError} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {useProfile} from '../accueil/queries';
import {LockedNotice} from '../plans/LockedNotice';
import {ProMark} from '../plans/PlanBadge';
import {usePlan} from '../plans/queries';
import {closestFrame, LabPlot, type PlotActivity} from './LabPlot';
import {studyStyles} from './studyFeatureStyles';

interface LabCase {
  label: string;
  context: string;
  question: string;
  choices: string[];
  answer_index: number;
  feedback: string;
}

interface ScenarioActivity {
  topic: string;
  title: string;
  instruction: string;
  cases: LabCase[];
}

export interface LabTopic {
  slug: string;
  /** French, from the catalog. */
  label: string;
}

const styles = stylex.create({
  range: {inlineSize: '100%', minBlockSize: '2.75rem', accentColor: en.link, margin: 0},
  choices: {display: 'grid', gap: en.space2, borderStyle: 'none', padding: 0, margin: 0, minInlineSize: 0},
  choice: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    minBlockSize: '2.75rem',
    paddingInline: en.space3,
    backgroundColor: en.surfaceSunken,
    borderRadius: en.radiusSm,
    cursor: 'pointer',
  },
  context: {padding: en.space3, borderRadius: en.radiusMd, backgroundColor: en.surfaceSunken},
  verdict: {display: 'flex', alignItems: 'flex-start', gap: en.space3, minInlineSize: 0},
  topic: {maxInlineSize: '22rem'},
});

/** The expected answer is rounded to two decimals; accept a comma, a minus sign and a small rounding gap. */
export function matchesLabAnswer(input: string, answer: number): boolean {
  const normalized = input.trim().replace(/^[−–]/, '-').replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) && Math.abs(Number(normalized) - answer) < 0.005;
}

function Verdict({correct, feedback, expected}: {correct: boolean; feedback: string; expected?: string}) {
  return (
    <div role="status" {...stylex.props(styles.verdict)}>
      <Mascot mood={correct ? 'cheer' : 'encourage'} size={44} />
      <div {...stylex.props(studyStyles.stack)}>
        <strong>{correct ? <Trans>Bonne prédiction !</Trans> : <Trans>Compare ta prédiction au résultat.</Trans>}</strong>
        {expected !== undefined && (
          <p {...stylex.props(studyStyles.text)}>
            <Trans>Résultat attendu</Trans> · <span dir="ltr">{expected}</span>
          </p>
        )}
        {feedback && (
          <p dir="auto" translate="no" {...stylex.props(studyStyles.text)}>
            <MathText text={feedback} />
          </p>
        )}
      </div>
    </div>
  );
}

function PlotExercise({activity}: {activity: PlotActivity}): React.JSX.Element | null {
  const {t, i18n} = useLingui();
  const [index, setIndex] = useState(() => closestFrame(activity.frames, 1));
  const [guess, setGuess] = useState('');
  const [checked, setChecked] = useState(false);
  const frame = activity.frames[index];
  const formatter = new Intl.NumberFormat(intlLocale(i18n.locale), {maximumFractionDigits: 2});
  const format = (value: number) => formatter.format(value);

  const select = (next: number) => {
    if (index === next) return;
    setIndex(next);
    setGuess('');
    setChecked(false);
  };

  if (!frame) return null;
  return (
    <div {...stylex.props(studyStyles.stack)}>
      <LabPlot activity={activity} frame={frame} onSelect={select} format={format} />
      <label {...stylex.props(studyStyles.field)}>
        <span translate="no">
          <MathText text={activity.parameter} /> · <span dir="ltr">{format(frame.value)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={activity.frames.length - 1}
          step={1}
          value={index}
          aria-label={activity.parameter.replaceAll('$', '')}
          aria-valuetext={format(frame.value)}
          onChange={event => select(Number(event.target.value))}
          {...stylex.props(styles.range)}
        />
      </label>
      <form
        {...stylex.props(studyStyles.actions)}
        onSubmit={event => {
          event.preventDefault();
          if (guess.trim()) setChecked(true);
        }}>
        <label {...stylex.props(studyStyles.field)}>
          <Trans>Ta prédiction</Trans>
          <input
            type="text"
            inputMode="decimal"
            maxLength={18}
            dir="ltr"
            value={guess}
            {...stylex.props(studyStyles.control)}
            onChange={event => {
              setGuess(event.target.value);
              setChecked(false);
            }}
          />
        </label>
        <Button type="submit" variant="secondary" label={t`Vérifier ma prédiction`} isDisabled={!guess.trim()} />
      </form>
      {checked && <Verdict correct={matchesLabAnswer(guess, frame.answer)} feedback={frame.feedback} expected={format(frame.answer)} />}
    </div>
  );
}

function ScenarioExercise({activity}: {activity: ScenarioActivity}): React.JSX.Element | null {
  const {t} = useLingui();
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const group = useId();
  const example = activity.cases[index];
  if (!example) return null;
  return (
    <div {...stylex.props(studyStyles.stack)}>
      <label {...stylex.props(studyStyles.field)}>
        <Trans>Situation</Trans>
        <select
          value={index}
          onChange={event => {
            setIndex(Number(event.target.value));
            setChoice(null);
            setChecked(false);
          }}
          {...stylex.props(studyStyles.control)}>
          {activity.cases.map((item, i) => (
            <option key={i} value={i} translate="no">
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p dir="auto" translate="no" {...stylex.props(studyStyles.text, styles.context)}>
        <MathText text={example.context} />
      </p>
      <form
        {...stylex.props(studyStyles.stack)}
        onSubmit={event => {
          event.preventDefault();
          if (choice !== null) setChecked(true);
        }}>
        <fieldset {...stylex.props(styles.choices)}>
          <legend dir="auto" translate="no">
            <MathText text={example.question} />
          </legend>
          {example.choices.map((label, i) => (
            <label key={i} {...stylex.props(styles.choice)}>
              <input
                type="radio"
                name={group}
                checked={choice === i}
                onChange={() => {
                  setChoice(i);
                  setChecked(false);
                }}
              />
              <span dir="auto" translate="no">
                <MathText text={label} />
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <Button type="submit" variant="secondary" label={t`Vérifier ma prédiction`} isDisabled={choice === null} />
        </div>
      </form>
      {checked && <Verdict correct={choice === example.answer_index} feedback={example.feedback} />}
    </div>
  );
}

export interface InteractiveLabProps {
  topic: string;
  /** The topics this lab can switch between. */
  topics: readonly LabTopic[];
  onTopic: (topic: string) => void;
  onClose: () => void;
}

/** The Pro lab: a live plot with a slider for the maths chapters, a scenario comparison for the other courses. */
export function InteractiveLab({topic, topics, onTopic, onClose}: InteractiveLabProps): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  const {api} = useSession();
  const {plan} = usePlan();
  const profile = useProfile();
  const language = profile.data?.reply_language ?? 'fr';
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const activity = useQuery({
    queryKey: ['interactive-lab', topic, language],
    queryFn: ({signal}) => api.request<PlotActivity | ScenarioActivity>('GET', `/learning/interactive-lab/${encodeURIComponent(topic)}`, {signal}),
    enabled: plan === 'pro',
    retry: false,
    gcTime: 0,
  });
  const locked = plan === 'free' || (activity.isError && isProRequired(activity.error));
  const missing = (activity.error as ApiError | null)?.code === 'lab_not_found';

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} {...stylex.props(studyStyles.panel)}>
      <header {...stylex.props(studyStyles.actions)}>
        <h2 id={headingId} ref={heading} tabIndex={-1} {...stylex.props(studyStyles.heading)}>
          <Trans>Labo interactif</Trans>
          {plan === 'free' && <ProMark />}
        </h2>
      </header>
      {locked ? (
        <LockedNotice title={t`Labo interactif`} reason={t`Le labo interactif est réservé à l’offre Pro. Les autres outils de révision restent ouverts.`} />
      ) : (
        <>
          {topics.length > 1 && (
            <div {...stylex.props(styles.topic)}>
              <Selector
                label={t`Sujet du labo`}
                options={topics.map(item => ({value: item.slug, label: serverText(item.label)}))}
                value={topic}
                onChange={onTopic}
              />
            </div>
          )}
          {activity.data && (
            <>
              <h3 dir="auto" translate="no" {...stylex.props(studyStyles.subheading)}>
                {activity.data.title}
              </h3>
              <p dir="auto" translate="no" {...stylex.props(studyStyles.text)}>
                <MathText text={activity.data.instruction} />
              </p>
              {'cases' in activity.data ? (
                <ScenarioExercise key={`${topic}:${language}`} activity={activity.data} />
              ) : (
                <PlotExercise key={`${topic}:${language}`} activity={activity.data} />
              )}
            </>
          )}
          {activity.isPending && (
            <div {...stylex.props(styles.verdict)}>
              <Mascot mood="thinking" size={44} />
              <p role="status" {...stylex.props(studyStyles.muted)}>
                <Trans>Chargement…</Trans>
              </p>
            </div>
          )}
          {activity.isError && (
            <div {...stylex.props(studyStyles.actions)}>
              <p role="alert" {...stylex.props(studyStyles.text)}>
                {missing ? t`Ce labo n’est pas disponible pour ce chapitre.` : t`Le labo ne s’est pas chargé. Réessaie.`}
              </p>
              {!missing && <Button variant="secondary" label={t`Réessayer`} onClick={() => void activity.refetch()} />}
            </div>
          )}
        </>
      )}
      <div>
        <Button variant="ghost" label={t`Fermer le labo`} onClick={onClose} />
      </div>
    </section>
  );
}
