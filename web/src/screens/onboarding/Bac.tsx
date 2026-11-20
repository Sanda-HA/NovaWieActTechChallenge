import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useNavigate} from 'react-router';
import {ChoiceCard} from '../../ui/ChoiceCard';
import {choiceGrid, Group} from './Group';
import {useOnboarding} from './state';
import {NextArrow, StepActions, StepFrame} from './StepFrame';
import {SECTIONS} from './steps';

export function Component(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const navigate = useNavigate();
  const {section, lang, patch, chooseLanguage, advance} = useOnboarding();
  return (
    <StepFrame mascot="idle" title={t`Comment veux-tu réviser ?`} sub={t`Choisis ta section du bac et la langue de Nova.`}>
      <Group title={t`Ta section du bac`}>
        <div role="radiogroup" aria-label={t`Ta section du bac`} {...stylex.props(choiceGrid.three)}>
          {SECTIONS.map(({id, title}) => (
            <ChoiceCard key={id} type="radio" name="section" title={i18n._(title)} checked={section === id} onChange={() => patch({section: id})} />
          ))}
        </div>
        <p {...stylex.props(choiceGrid.note)}>{t`Nova choisit les extraits du cours selon ta section. Tu pourras la changer dans les réglages.`}</p>
      </Group>
      <Group title={t`Je te réponds en…`}>
        <div role="radiogroup" aria-label={t`Langue de mes réponses`} {...stylex.props(choiceGrid.two)}>
          <ChoiceCard
            type="radio"
            name="reply-language"
            title="Français"
            description={t`Utiliser Nova en français.`}
            checked={lang === 'fr'}
            onChange={() => chooseLanguage('fr')}
          />
          <ChoiceCard
            type="radio"
            name="reply-language"
            title="English"
            description={t`Utiliser Nova en anglais.`}
            checked={lang === 'en'}
            onChange={() => chooseLanguage('en')}
          />
          <ChoiceCard
            type="radio"
            name="reply-language"
            title="العربية"
            description={t`Utiliser Nova en arabe.`}
            checked={lang === 'ar'}
            onChange={() => chooseLanguage('ar')}
          />
        </div>
      </Group>
      <StepActions onBack={() => void navigate('/compte')}>
        <Button variant="primary" size="lg" label={t`C’est bien ça`} isDisabled={!section} endContent={<NextArrow />} onClick={() => void advance('bac', 'style')} />
      </StepActions>
    </StepFrame>
  );
}
