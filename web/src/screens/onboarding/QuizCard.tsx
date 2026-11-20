import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {useLingui} from '@lingui/react/macro';
import {useId, useRef, type KeyboardEvent} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {NextArrow} from './StepFrame';

const styles = stylex.create({
  card: {
    display: 'grid',
    gap: en.space5,
    maxInlineSize: 640,
    padding: {default: en.space4, '@media (width >= 640px)': en.space6},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  progress: {display: 'flex', gap: 3},
  tile: {
    flexGrow: 1,
    blockSize: 6,
    maxInlineSize: 40,
    borderRadius: en.radiusTessera,
    backgroundColor: en.line,
    transitionProperty: 'background-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
  },
  tileDone: {backgroundColor: en.faience},
  tileCurrent: {backgroundColor: en.argile},
  question: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    overflowWrap: 'anywhere',
  },
  srOnly: {
    position: 'absolute',
    inlineSize: 1,
    blockSize: 1,
    margin: -1,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  choices: {display: 'grid', gap: en.space2},
  choice: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space3,
    inlineSize: '100%',
    minBlockSize: en.sizeTouch,
    padding: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {default: en.line, ':hover': en.lineStrong},
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    textAlign: 'start',
    cursor: 'pointer',
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
    transitionProperty: 'border-color, background-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
  },
  choiceOn: {borderColor: en.argile, backgroundColor: en.argileSoft, boxShadow: `inset 0 0 0 1px ${en.argile}`},
  key: {
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    inlineSize: 24,
    blockSize: 24,
    borderRadius: en.radiusTessera,
    backgroundColor: en.surfaceSunken,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    fontWeight: 600,
  },
  choiceLabel: {minInlineSize: 0, overflowWrap: 'anywhere'},
  foot: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: en.space3},
  hint: {
    display: {default: 'none', '@media (width >= 640px)': 'inline'},
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  result: {display: 'grid', justifyItems: 'start', gap: en.space4},
  resultTitle: {
    margin: 0,
    fontFamily: en.fontDisplay,
    fontSize: en.typeTitleSize,
    lineHeight: en.typeTitleLeading,
    fontWeight: en.typeTitleWeight,
    color: en.ink,
  },
  facts: {display: 'grid', gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 640px)': 'repeat(2, minmax(0, 1fr))'}, gap: en.space4, margin: 0, inlineSize: '100%'},
  factTerm: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
  },
  factValue: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: 600,
  },
  summary: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
});

export interface QuizQuestionProps {
  step: number;
  total: number;
  question: string;
  choices: ReadonlyArray<{id: string; label: string}>;
  selected?: string;
  onSelect(id: string): void;
  onNext(): void;
}

/** One question: answers are a radio group, reachable with the number keys 1 to n and the arrow keys. */
export function QuizQuestion({step, total, question, choices, selected, onSelect, onNext}: QuizQuestionProps): React.JSX.Element {
  const {t} = useLingui();
  const titleId = useId();
  const group = useRef<HTMLDivElement>(null);
  const progress = t`Question ${step} sur ${total}`;
  const count = choices.length;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const number = Number(event.key);
    if (number >= 1 && number <= choices.length) {
      onSelect(choices[number - 1]!.id);
      event.preventDefault();
      return;
    }
    const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    const current = Math.max(
      choices.findIndex(choice => choice.id === selected),
      0,
    );
    const next = choices[(current + delta + choices.length) % choices.length]!;
    onSelect(next.id);
    group.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`)?.focus();
    event.preventDefault();
  };

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.card)}>
      <div role="img" aria-label={progress} {...stylex.props(styles.progress)}>
        {Array.from({length: total}, (_, index) => (
          <span key={index} {...stylex.props(styles.tile, index < step - 1 && styles.tileDone, index === step - 1 && styles.tileCurrent)} />
        ))}
      </div>
      <p {...stylex.props(styles.question)}>
        <MathText text={question} />
      </p>
      <span id={titleId} {...stylex.props(styles.srOnly)}>
        {progress}
      </span>
      <div ref={group} role="radiogroup" aria-labelledby={titleId} onKeyDown={onKeyDown} {...stylex.props(styles.choices)}>
        {choices.map((choice, index) => {
          const on = choice.id === selected;
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-id={choice.id}
              tabIndex={on || (!selected && index === 0) ? 0 : -1}
              onClick={() => onSelect(choice.id)}
              {...stylex.props(styles.choice, on && styles.choiceOn)}>
              <span aria-hidden="true" {...stylex.props(styles.key)}>
                {index + 1}
              </span>
              <span {...stylex.props(styles.choiceLabel)}>
                <MathText text={choice.label} />
              </span>
            </button>
          );
        })}
      </div>
      <div {...stylex.props(styles.foot)}>
        <span {...stylex.props(styles.hint)}>{t`Touches 1 à ${count} pour choisir`}</span>
        <Button
          variant="primary"
          label={step === total ? t`Voir mon résultat` : t`Suivant`}
          endContent={<NextArrow />}
          isDisabled={!selected}
          onClick={onNext}
        />
      </div>
    </section>
  );
}

export interface QuizOutcomeProps {
  style: string;
  level: string;
  summary: string;
  onNext(): void;
}

/** "Ton point de départ": how the learner likes to learn and where they start. Not a mark. */
export function QuizOutcome({style, level, summary, onNext}: QuizOutcomeProps): React.JSX.Element {
  const {t} = useLingui();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.result)}>
        <Mascot mood="cheer" size={96} />
        <Heading level={2} id={titleId} xstyle={styles.resultTitle}>
          {t`Ton point de départ`}
        </Heading>
        <dl {...stylex.props(styles.facts)}>
          <div>
            <dt {...stylex.props(styles.factTerm)}>{t`Ta façon d’apprendre`}</dt>
            <dd {...stylex.props(styles.factValue)}>{style}</dd>
          </div>
          <div>
            <dt {...stylex.props(styles.factTerm)}>{t`Niveau de départ`}</dt>
            <dd {...stylex.props(styles.factValue)}>{level}</dd>
          </div>
        </dl>
        <p {...stylex.props(styles.summary)}>{summary}</p>
        <Button variant="primary" size="lg" label={t`Voir un exemple de programme`} endContent={<NextArrow />} onClick={onNext} />
      </div>
    </section>
  );
}
