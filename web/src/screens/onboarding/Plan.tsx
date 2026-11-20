import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';
import {MathText} from '../../ui/MathText';
import {ProbabilityTree} from '../../ui/ProbabilityTree';
import {SourceChip} from '../../ui/SourceChip';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Group} from './Group';
import {useOnboarding} from './state';
import {NextArrow, StepActions, StepFrame} from './StepFrame';
import {TOOLS} from './steps';

const styles = stylex.create({
  panel: {
    display: 'grid',
    gap: en.space4,
    padding: en.space5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  plan: {display: 'grid', margin: 0, padding: 0, listStyle: 'none', overflow: 'hidden', gap: 0},
  item: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'start',
    gap: en.space3,
    padding: {default: en.space4, '@media (width >= 640px)': en.space5},
  },
  first: {backgroundColor: en.argileSoft},
  later: {borderBlockStartColor: en.line, borderBlockStartStyle: 'solid', borderBlockStartWidth: 1},
  symbol: {
    display: 'grid',
    placeItems: 'center',
    inlineSize: '2.5rem',
    blockSize: '2.5rem',
    color: en.argileStrong,
    backgroundColor: en.surface,
    borderRadius: en.radiusMd,
  },
  slot: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: en.space2},
  when: {color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 700},
  minutes: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  task: {display: 'grid', gap: en.space1, minInlineSize: 0},
  taskText: {color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, overflowWrap: 'anywhere'},
  tool: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeMicroSize, lineHeight: en.typeMicroLeading},
  aside: {color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  body: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  bodyLg: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading},
  source: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2},
  tools: {display: 'flex', flexWrap: 'wrap', gap: en.space2, margin: 0, padding: 0, listStyle: 'none'},
  toolChip: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusSm,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
  },
  short: {display: {default: 'inline', '@media (width >= 640px)': 'none'}},
  long: {display: {default: 'none', '@media (width >= 640px)': 'inline'}},
  toolIcon: {display: 'inline-flex', color: en.argileStrong},
  soon: {
    paddingInline: 6,
    borderRadius: en.radiusTessera,
    backgroundColor: en.surfaceSunken,
    color: en.inkMuted,
    fontSize: en.typeMicroSize,
  },
});


export function Component(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const navigate = useNavigate();
  const {tools, style, finish} = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const visual = style !== 'lecture';
  const chosen = TOOLS.filter(tool => tools.has(tool.id));
  const total = 20 + 15 + 15;
  // The braces of TeX are quoted ('{'): in a message, a bare brace opens a placeholder.
  const treeSentence = t`Sur un arbre, on multiplie le long d’un chemin : $P(A \\cap B) = 0'{','}'4 \\times 0'{','}'25 = 0'{','}'1$.`;
  const definition = t`La probabilité de $B$ sachant $A$ :

$$P_A(B) = \\frac'{'P(A \\cap B)'}{'P(A)'}' = \\frac'{'0'{','}'1'}{'0'{','}'4'}' = 0'{','}'25.$$`;

  const items = [
    {when: t`Ce soir`, minutes: 20, task: t`Réviser une notion dans la matière de ton choix`, tool: t`Tuteur · Exemple`},
    {when: t`Demain`, minutes: 15, task: t`Retrouver de mémoire ce que tu as appris`, tool: t`Révision · Exemple`},
    {when: t`Mercredi`, minutes: 15, task: t`Expliquer une notion avec tes propres mots`, tool: t`Mode Feynman · Exemple`},
  ];

  const start = async () => {
    setSaving(true);
    setFailed(false);
    if (!(await finish())) setFailed(true);
    setSaving(false);
  };

  return (
    <StepFrame
      mascot="cheer"
      title={t`Ton plan de révision`}
      sub={t`Ce programme est un exemple. Il ne sera pas enregistré.`}>
      <Group
        title={t`Cette semaine`}
        aside={<span {...stylex.props(styles.aside)}>{t`Environ ${total} min en tout`}</span>}>
        <ol {...stylex.props(styles.panel, styles.plan)}>
          {items.map(({when, minutes, task, tool}, index) => (
            <li key={when} {...stylex.props(styles.item, index === 0 ? styles.first : styles.later)}>
              <span aria-hidden="true" {...stylex.props(styles.symbol)}><Icon name={index === 0 ? 'target' : index === 1 ? 'review' : 'chat'} size={20} /></span>
              <span {...stylex.props(styles.task)}>
                <span {...stylex.props(styles.slot)}>
                  <span {...stylex.props(styles.when)}>{when}</span>
                  <span {...stylex.props(styles.minutes)}>{t`${minutes} min`}</span>
                </span>
                <span {...stylex.props(styles.taskText)}><MathText text={task} /></span>
                <span {...stylex.props(styles.tool)}>{tool}</span>
              </span>
            </li>
          ))}
        </ol>
      </Group>
      {failed && <ErrorBanner message={t`Tes choix n’ont pas pu être enregistrés. Réessaie.`} />}
      <StepActions onBack={saving ? undefined : () => void navigate('/diagnostic')}>
        <Button
          variant="primary"
          size="lg"
          label={t`Commencer ma première séance`}
          isLoading={saving}
          isDisabled={saving}
          endContent={<NextArrow />}
          onClick={() => void start()}>
          <span {...stylex.props(styles.short)}>{t`Commencer`}</span>
          <span {...stylex.props(styles.long)}>{t`Commencer ma première séance`}</span>
        </Button>
      </StepActions>
      <Group
        title={t`Comment je vais t’expliquer`}
        aside={
          <span {...stylex.props(styles.aside)}>
            {visual ? t`Visuel` : t`Lecture`}
            {' '}
            {t`· Ta préférence`}
          </span>
        }>
        <article {...stylex.props(styles.panel)}>
          {visual ? (
            <>
              <ProbabilityTree />
              <p {...stylex.props(styles.body)}>
                <MathText text={treeSentence} />
              </p>
            </>
          ) : (
            <div {...stylex.props(styles.bodyLg)}>
              <MathText text={definition} />
            </div>
          )}
          <div {...stylex.props(styles.source)}>
            <span {...stylex.props(styles.aside)}>{t`Source`}</span>
            <SourceChip page={147} />
          </div>
        </article>
      </Group>
      <Group title={t`Tes outils`}>
        {chosen.length === 0 ? (
          <p {...stylex.props(styles.body)}>{t`Aucun outil choisi : tu peux en ajouter dans les réglages.`}</p>
        ) : (
          <ul {...stylex.props(styles.tools)}>
            {chosen.map(tool => (
              <li key={tool.id} {...stylex.props(styles.toolChip)}>
                <span aria-hidden="true" {...stylex.props(styles.toolIcon)}>
                  <Icon name={tool.icon} size={16} />
                </span>
                {i18n._(tool.title)}
                {tool.soon && <span {...stylex.props(styles.soon)}>{t`Bientôt`}</span>}
              </li>
            ))}
          </ul>
        )}
      </Group>
    </StepFrame>
  );
}
