import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {useServerText} from '../../i18n/serverText';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {formatLabel} from './diagnosticBank';
import {useDiagnosticBank, useSubmitDiagnostic} from './queries';
import {QuizOutcome, QuizQuestion} from './QuizCard';
import {useOnboarding} from './state';
import {StepActions, StepFrame} from './StepFrame';

type Phase = 'quiz' | 'thinking' | 'result';

const pulse = stylex.keyframes({
  '0%, 100%': {backgroundColor: en.line},
  '50%': {backgroundColor: en.argile},
});

const styles = stylex.create({
  thinking: {
    display: 'grid',
    justifyItems: 'center',
    gap: en.space4,
    maxInlineSize: 640,
    padding: en.space10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  tiles: {display: 'flex', gap: 4, margin: 0, padding: 0, listStyle: 'none'},
  tile: {
    inlineSize: 22,
    blockSize: 22,
    borderRadius: en.radiusTessera,
    backgroundColor: en.line,
    animationName: {default: pulse, '@media (prefers-reduced-motion: reduce)': 'none'},
    animationDuration: '1.4s',
    animationTimingFunction: en.ease,
    animationIterationCount: 'infinite',
  },
  delay1: {animationDelay: '0.15s'},
  delay2: {animationDelay: '0.3s'},
  delay3: {animationDelay: '0.45s'},
  label: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 600},
  placeholder: {display: 'grid', gap: en.space3, maxInlineSize: 640},
});

export function Component(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const serverText = useServerText();
  const navigate = useNavigate();
  const {answers, outcome, style, patch} = useOnboarding();
  const bank = useDiagnosticBank();
  const submit = useSubmitDiagnostic();
  const [phase, setPhase] = useState<Phase>(outcome ? 'result' : 'quiz');
  const [position, setPosition] = useState(Object.keys(answers).length);

  const questions = bank.data ?? [];
  const total = questions.length;
  const index = Math.min(position, Math.max(total - 1, 0));
  const current = questions[index];

  const send = () => {
    setPhase('thinking');
    submit.mutate(answers, {
      onSuccess: result => {
        patch({outcome: result});
        setPhase('result');
      },
      onError: () => setPhase('quiz'),
    });
  };

  const next = () => (index < total - 1 ? setPosition(index + 1) : send());

  const back = () => {
    if (phase === 'result') {
      setPhase('quiz');
      setPosition(Math.max(total - 1, 0));
    } else if (index > 0) {
      setPosition(index - 1);
    } else {
      void navigate('/outils');
    }
  };

  const skip = () => {
    patch({answers: {}});
    void navigate('/plan');
  };

  const heading =
    phase === 'quiz'
      ? {
          mascot: 'idle' as const,
          title: t`Six questions rapides pour savoir par où commencer.`,
          sub: t`Pas de note, pas de chrono. Si tu hésites, choisis ce qui te semble le plus juste.`,
        }
      : phase === 'thinking'
        ? {mascot: 'thinking' as const, title: t`Je regarde tes réponses…`, sub: t`Je prépare tes pistes pour mieux réviser.`}
        : {mascot: undefined, title: t`Voilà ton point de départ.`, sub: t`Ce n’est pas une note : c’est l’endroit d’où on part.`};

  const score = outcome?.diagnostic_score ?? null;
  const summary = score === null ? t`Pas encore évalué` : t`${score} sur 3 pour les questions sur les méthodes de révision.`;

  return (
    <StepFrame mascot={heading.mascot} title={heading.title} sub={heading.sub} focusKey={phase}>
      {(bank.isError || (submit.isError && phase === 'quiz')) && (
        <ErrorBanner message={t`Diagnostic indisponible. Réessaie.`} onRetry={bank.isError ? () => void bank.refetch() : undefined} />
      )}
      {phase === 'quiz' && bank.isPending && (
        <div aria-busy="true" {...stylex.props(styles.placeholder)}>
          <Skeleton width="100%" height={220} />
        </div>
      )}
      {phase === 'quiz' && current && (
        <QuizQuestion
          key={current.id}
          step={index + 1}
          total={total}
          question={serverText(current.question)}
          choices={current.choices.map(choice => ({id: choice.id, label: serverText(choice.label)}))}
          selected={answers[current.id]}
          onSelect={choice => patch({answers: {...answers, [current.id]: choice}})}
          onNext={next}
        />
      )}
      {phase === 'thinking' && (
        <div role="status" {...stylex.props(styles.thinking)}>
          <ol aria-hidden="true" {...stylex.props(styles.tiles)}>
            {[undefined, styles.delay1, styles.delay2, styles.delay3].map((delay, tile) => (
              <li key={tile} {...stylex.props(styles.tile, delay)} />
            ))}
          </ol>
          <p {...stylex.props(styles.label)}>{t`Je prépare ton point de départ…`}</p>
        </div>
      )}
      {phase === 'result' && (
        <QuizOutcome
          style={i18n._(formatLabel(style, outcome))}
          level={t`Méthodes de révision`}
          summary={summary}
          onNext={() => void navigate('/plan')}
        />
      )}
      <StepActions onBack={phase === 'thinking' ? undefined : back}>
        {phase === 'quiz' && <Button variant="ghost" label={t`Passer les questions`} onClick={skip} />}
      </StepActions>
    </StepFrame>
  );
}
