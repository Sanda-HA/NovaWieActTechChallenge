import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {ChoiceCard} from '../../ui/ChoiceCard';
import {Icon} from '../../ui/icons';
import {MathText} from '../../ui/MathText';
import {ProbabilityTree} from '../../ui/ProbabilityTree';
import {choiceGrid} from './Group';
import {useOnboarding} from './state';
import {NextArrow, StepActions, StepFrame} from './StepFrame';

const styles = stylex.create({
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    margin: 0,
    color: en.harissa,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});

export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const navigate = useNavigate();
  const {style, patch, advance} = useOnboarding();
  const [missing, setMissing] = useState(false);
  const choose = (value: 'visuel' | 'lecture') => {
    patch({style: value});
    setMissing(false);
  };
  return (
    <StepFrame
      mascot="idle"
      title={t`Tu comprends mieux avec un dessin ou avec un texte bien posé ?`}
      sub={t`Choisis la façon dont Nova te présentera ses explications.`}>
      <div role="radiogroup" aria-label={t`Ta façon d’apprendre`} {...stylex.props(choiceGrid.two)}>
        <ChoiceCard
          type="radio"
          name="style"
          icon="tesserae"
          title={t`Visuel`}
          description={t`Des schémas, des arbres et des courbes, comme au tableau.`}
          art={<ProbabilityTree small />}
          checked={style === 'visuel'}
          onChange={() => choose('visuel')}
        />
        <ChoiceCard
          type="radio"
          name="style"
          icon="book-open"
          title={t`Lecture`}
          description={t`Un texte net, avec des formules bien composées.`}
          art={<MathText text={String.raw`$$P_A(B) = \dfrac{P(A \cap B)}{P(A)}$$`} />}
          checked={style === 'lecture'}
          onChange={() => choose('lecture')}
        />
      </div>
      {missing && (
        <p role="alert" {...stylex.props(styles.alert)}>
          <Icon name="alert" size={16} />
          {t`Choisis une des deux façons pour continuer.`}
        </p>
      )}
      <StepActions onBack={() => void navigate('/bac')}>
        <Button
          variant="primary"
          size="lg"
          label={t`Continuer`}
          endContent={<NextArrow />}
          onClick={() => (style ? void advance('style', 'outils') : setMissing(true))}
        />
      </StepActions>
    </StepFrame>
  );
}
