import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import type {AttemptResult} from '../../lib/types';
import {useServerText} from '../../i18n/serverText';
import {en} from '../../theme/ednova.stylex';
import {Icon, type IconName} from '../../ui/icons';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {Tessera} from '../../ui/Mosaic';

export interface CheckResult extends Omit<AttemptResult, 'source'> {
  source?: AttemptResult['source'];
  missing_points?: string[];
  restate_prompt?: string;
}

export interface CheckCardProps {
  value: CheckResult;
  /** `peer`: the explanation check in a study room; `attempt`: a learner's answer to a guided exercise. */
  context: 'peer' | 'attempt';
  /** The chapter the learner just set a tile for; shown only on a correct attempt. */
  tile?: {label: string; glaze: boolean};
  /** Defaults to focusing `#explanation-draft`, where the study room's explanation is written. */
  onRestate?: () => void;
}

const styles = stylex.create({
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: en.space4,
    minInlineSize: 0,
    paddingBlock: en.space4,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderInlineStartWidth: 4,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
  },
  correct: {borderInlineStartColor: en.masteryStrong},
  incomplete: {borderInlineStartColor: en.masteryMedium},
  incorrect: {borderInlineStartColor: en.masteryWeak},
  main: {display: 'grid', gap: en.space2, flexGrow: 1, minInlineSize: 0, overflowWrap: 'anywhere'},
  kicker: {
    margin: 0,
    color: en.inkMuted,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    margin: 0,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
  },
  text: {margin: 0, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  question: {display: 'flex', alignItems: 'flex-start', gap: en.space2, color: en.ink},
  questionIcon: {display: 'inline-flex', flexShrink: 0, marginBlockStart: 2, color: en.argileStrong},
  missing: {display: 'grid', gap: en.space1},
  missingTitle: {margin: 0, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 700},
  list: {margin: 0, paddingInlineStart: en.space5, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  action: {justifySelf: 'start', marginBlockStart: en.space1},
  tile: {display: 'grid', flexShrink: 0, inlineSize: '6rem', blockSize: '4.5rem'},
  wellbeing: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space4,
    minInlineSize: 0,
    padding: en.space4,
    borderRadius: en.radiusLg,
    backgroundColor: en.calm,
    color: en.calmInk,
    fontFamily: en.fontText,
  },
  wellbeingText: {display: 'grid', gap: en.space2, minInlineSize: 0, overflowWrap: 'anywhere'},
  wellbeingTitle: {margin: 0, fontFamily: en.fontDisplay, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
  wellbeingBody: {fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading},
  aiLabel: {margin: 0, fontSize: en.typeMicroSize, lineHeight: en.typeMicroLeading, opacity: 0.8},
});

const TITLE_ICON: Record<'correct' | 'incomplete' | 'incorrect', IconName> = {
  correct: 'check',
  incomplete: 'tesserae',
  incorrect: 'refresh',
};

/** The calm message shown when a message or an answer is about how the learner feels. */
export function Wellbeing({children, aiLabel}: {children?: React.ReactNode; aiLabel?: string}): React.JSX.Element {
  const {t} = useLingui();
  return (
    <article aria-label={t`Message de bien-être`} {...stylex.props(styles.wellbeing)}>
      <Mascot mood="calm" size={72} />
      <div {...stylex.props(styles.wellbeingText)}>
        <h3 {...stylex.props(styles.wellbeingTitle)}>{t`On fait une pause ensemble ?`}</h3>
        <div {...stylex.props(styles.wellbeingBody)}>
          {children ??
            t`Ce que tu ressens compte plus que n’importe quel exercice. Parles-en à un adulte de confiance : un parent, un professeur, l’infirmière ou le conseiller de ton lycée. Je serai là quand tu voudras reprendre.`}
        </div>
        {aiLabel && <p {...stylex.props(styles.aiLabel)}>{aiLabel}</p>}
      </div>
    </article>
  );
}

/**
 * The verdict on an explanation or an answer: what is right, what is missing, and the question that guides the next try.
 * A verdict the backend could not reach (`unknown`) reads "Vérification indisponible" rather than a wrong answer.
 */
export function CheckCard({value, context, tile, onRestate}: CheckCardProps): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  if (value.verdict === 'wellbeing') return <Wellbeing />;

  const unavailable = value.verdict === 'unknown';
  const verdict = value.verdict === 'unknown' ? 'incomplete' : value.verdict;
  const title = unavailable
    ? t`Je n'ai pas pu vérifier`
    : verdict === 'correct'
      ? t`Juste`
      : verdict === 'incomplete'
        ? t`Presque : il manque une pièce`
        : t`Pas encore`;
  const kicker = context === 'peer' ? (unavailable ? t`Vérification indisponible` : t`Explication vérifiée`) : t`Ta réponse`;
  const label = `${context === 'peer' ? t`Vérification de l’explication` : t`Ta réponse`} : ${title}`;
  const missing = value.missing_points ?? [];
  const restate = () => (onRestate ? onRestate() : document.getElementById('explanation-draft')?.focus());

  return (
    <>
      <article aria-label={label} {...stylex.props(styles.card, styles[verdict])}>
        <div {...stylex.props(styles.main)}>
          <p {...stylex.props(styles.kicker)}>{kicker}</p>
          <h3 {...stylex.props(styles.title)}>
            <Icon name={TITLE_ICON[verdict]} size={20} />
            {title}
          </h3>
          {value.issue && (
            <p {...stylex.props(styles.text)}>
              <MathText text={serverText(value.issue)} />
            </p>
          )}
          {value.guiding_question && (
            <div {...stylex.props(styles.question)}>
              <span {...stylex.props(styles.questionIcon)}>
                <Icon name="question" size={20} />
              </span>
              <p {...stylex.props(styles.text)}>
                <MathText text={serverText(value.guiding_question)} />
              </p>
            </div>
          )}
        </div>
        {context === 'attempt' && verdict === 'correct' && tile && (
          <div {...stylex.props(styles.tile)}>
            <Tessera label={tile.label} level="strong" glazeOnMount={tile.glaze} />
          </div>
        )}
      </article>
      {missing.length > 0 && (
        <section aria-label={t`Ce qui manque`} {...stylex.props(styles.missing)}>
          <h3 {...stylex.props(styles.missingTitle)}>{t`Ce qui manque`}</h3>
          <ul {...stylex.props(styles.list)}>
            {missing.map(point => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      )}
      {value.restate_prompt && <p {...stylex.props(styles.text)}>{value.restate_prompt}</p>}
      {context === 'peer' && value.restate_prompt && (
        <div {...stylex.props(styles.action)}>
          <Button variant="secondary" size="sm" label={t`Réexpliquer`} onClick={restate} />
        </div>
      )}
    </>
  );
}
