import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {plural} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {useNavigate} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {ChoiceCard} from '../../ui/ChoiceCard';
import {choiceGrid} from './Group';
import {useOnboarding} from './state';
import {NextArrow, StepActions, StepFrame} from './StepFrame';
import {TOOLS} from './steps';

const styles = stylex.create({
  count: {
    display: {default: 'none', '@media (width >= 640px)': 'inline'},
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});

export function Component(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const navigate = useNavigate();
  const {tools, toggleTool, advance} = useOnboarding();
  const count = tools.size;
  return (
    <StepFrame mascot="idle" title={t`Qu’est-ce que tu veux avoir sous la main ?`} sub={t`Choisis les outils à afficher sur ton accueil.`}>
      <div role="group" aria-label={t`Tes outils d’étude`} {...stylex.props(choiceGrid.two)}>
        {TOOLS.map(tool => (
          <ChoiceCard
            key={tool.id}
            type="checkbox"
            icon={tool.icon}
            title={i18n._(tool.title)}
            description={i18n._(tool.description)}
            tag={tool.soon ? t`Bientôt` : undefined}
            disabled={tool.soon}
            checked={tools.has(tool.id)}
            onChange={on => toggleTool(tool.id, on)}
          />
        ))}
      </div>
      <StepActions onBack={() => void navigate('/style')}>
        <span {...stylex.props(styles.count)}>{plural(count, {one: '# outil choisi', other: '# outils choisis'})}</span>
        <Button variant="primary" size="lg" label={t`Continuer`} endContent={<NextArrow />} onClick={() => void advance('outils', 'diagnostic')} />
      </StepActions>
    </StepFrame>
  );
}
