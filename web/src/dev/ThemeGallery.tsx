import * as stylex from '@stylexjs/stylex';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Selector} from '@astryxdesign/core/Selector';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Toast} from '@astryxdesign/core/Toast';
import {Theme} from '@astryxdesign/core/theme';
import {colorVars, radiusVars, spacingVars} from '@astryxdesign/core/theme/tokens.stylex';
import {useEffect, useState} from 'react';
import {tesselleTheme} from '../theme/built/tesselle.js';
import {en} from '../theme/ednova.stylex';
import {Icon, iconPaths, type IconName} from '../ui/icons';
import {Mark} from '../ui/Mark';
import {Mascot, type MascotMood} from '../ui/Mascot';
import {MASTERY_LABEL, MasteryTessera, type MasteryLevel} from '../ui/MasteryTessera';
import {MathText} from '../ui/MathText';
import {Streak} from '../ui/Streak';

type Mode = 'light' | 'dark';
type Dir = 'ltr' | 'rtl';

const local = tesselleTheme.localTokens ?? {};

function pairOf(name: string): [string, string] {
  const match = /^light-dark\((#[0-9A-Fa-f]+), (#[0-9A-Fa-f]+)\)$/.exec(local[`--en-${name}`] ?? '');
  return [match?.[1] ?? '?', match?.[2] ?? '?'];
}

const COLOUR_GROUPS: ReadonlyArray<{title: string; note: string; names: string[]}> = [
  {
    title: 'Chaux et nuit',
    note: 'Les fonds, les traits, l’encre.',
    names: ['ground', 'surface', 'surface-sunken', 'surface-raised', 'line', 'line-strong', 'ink', 'ink-muted'],
  },
  {
    title: 'Argile',
    note: 'La voix de Nova : l’action, les liens, le focus.',
    names: ['argile', 'argile-strong', 'argile-soft', 'on-argile', 'link', 'focus'],
  },
  {title: 'Faïence', note: 'Le manuel : le cours, les sources, le juste.', names: ['faience', 'faience-soft', 'on-faience']},
  {title: 'Ocre', note: 'La récompense et l’attention.', names: ['ocre', 'ocre-soft', 'ocre-ink', 'on-ocre']},
  {title: 'Crépuscule', note: 'Le bien-être, et rien d’autre.', names: ['calm', 'calm-ink', 'calm-accent']},
  {title: 'Harissa', note: 'Les vraies erreurs, jamais une réponse fausse.', names: ['harissa', 'harissa-soft', 'on-harissa']},
  {title: 'Rail', note: 'L’entrée choisie de la navigation.', names: ['rail-active', 'on-rail-active', 'rail-active-edge']},
  {
    title: 'Maîtrise',
    note: 'Une rampe de faïence, toujours avec un mot.',
    names: ['mastery-unknown', 'mastery-weak', 'mastery-medium', 'mastery-strong'],
  },
  {
    title: 'Badges',
    note: 'La rareté se lit d’abord à la forme.',
    names: ['tier-argile', 'tier-faience', 'tier-marbre', 'tier-lapis', 'tier-or'],
  },
  {title: 'Marque et Nova', note: 'Le logo et le jasmin.', names: ['mark-ribbon', 'mark-turn', 'nova-jasmine']},
];

const TYPE_STYLES: ReadonlyArray<{name: string; sample: string; family: 'display' | 'text' | 'math'}> = [
  {name: 'display-xl', sample: 'Pièce par pièce', family: 'display'},
  {name: 'display', sample: 'Bonsoir, Yasmine', family: 'display'},
  {name: 'title', sample: 'Ta carte des chapitres', family: 'display'},
  {name: 'numeral', sample: '24:59', family: 'display'},
  {name: 'heading', sample: 'Probabilité conditionnelle', family: 'text'},
  {name: 'body-lg', sample: 'On cherche la probabilité que B se réalise sachant que A est réalisé.', family: 'text'},
  {name: 'body', sample: 'Pose ta question : je cherche d’abord dans ton manuel.', family: 'text'},
  {name: 'label', sample: 'Un indice', family: 'text'},
  {name: 'caption', sample: 'Manuel, tome 2 · p. 147', family: 'text'},
  {name: 'micro', sample: 'réponse générée par IA', family: 'text'},
  {name: 'math', sample: '$P(B \\mid A) = \\dfrac{P(A \\cap B)}{P(A)}$', family: 'math'},
  {name: 'arabic', sample: 'الاحتمالات الشرطية', family: 'text'},
];

/** A border band of the mosaic floor Nova stands on: grout-set tesserae in the three minerals. */
const FLOOR: ReadonlyArray<readonly string[]> = [['line'], ['argile', 'ocre', 'faience'], ['line']];

const FAMILY_NAME = {display: 'Kufam', text: 'Readex Pro', math: 'KaTeX'} as const;

const MASCOTS: ReadonlyArray<{mood: MascotMood; name: string; use: string}> = [
  {mood: 'idle', name: 'Accueil', use: 'Bienvenue, accueil du soir'},
  {mood: 'thinking', name: 'Réflexion', use: 'Pendant la recherche'},
  {mood: 'cheer', name: 'Bravo', use: 'Une explication juste'},
  {mood: 'encourage', name: 'Encouragement', use: 'Pas encore, on réessaie'},
  {mood: 'calm', name: 'Calme', use: 'Le message de bien-être'},
];

const CHAPTERS: ReadonlyArray<{chapter: string; level: MasteryLevel; detail: string}> = [
  {chapter: 'Suites numériques', level: 'strong', detail: '9 exercices, 8 réussis'},
  {chapter: 'Probabilité conditionnelle', level: 'medium', detail: '5 exercices, 3 réussis'},
  {chapter: 'Nombres complexes', level: 'weak', detail: '4 exercices, 1 réussi'},
  {chapter: 'Intégrales', level: 'unknown', detail: 'Pas encore travaillé'},
];

const SECTIONS = [
  {value: 'math', label: 'Mathématiques'},
  {value: 'sciences', label: 'Sciences expérimentales'},
  {value: 'technique', label: 'Sciences techniques'},
  {value: 'eco', label: 'Économie et gestion'},
  {value: 'lettres', label: 'Lettres'},
];

const LEARNING_STYLES = [
  {id: 'pas-a-pas', title: 'Pas à pas', text: 'Nova te guide avec des indices, une marche à la fois.', icon: 'stairs'},
  {id: 'direct', title: 'Droit au but', text: 'Une réponse claire, puis un exercice pour vérifier.', icon: 'target'},
  {id: 'expliquer', title: 'À ton tour', text: 'Tu expliques, Nova relit et te dit ce qui manque.', icon: 'pen'},
] as const;

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    backgroundColor: colorVars['--color-background-body'],
    color: colorVars['--color-text-primary'],
  },
  frame: {
    maxWidth: en.widthShell,
    marginInline: 'auto',
    paddingInline: {default: spacingVars['--spacing-4'], '@media (min-width: 768px)': spacingVars['--spacing-10']},
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacingVars['--spacing-3'],
    paddingBlock: spacingVars['--spacing-4'],
  },
  brand: {display: 'flex', alignItems: 'center', gap: spacingVars['--spacing-2'], color: colorVars['--color-text-primary']},
  wordmark: {fontFamily: en.fontDisplay, fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1},
  controls: {display: 'flex', alignItems: 'center', gap: spacingVars['--spacing-2'], flexWrap: 'wrap'},
  hero: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 900px)': 'minmax(0, 1.35fr) minmax(0, 1fr)'},
    alignItems: 'center',
    gap: spacingVars['--spacing-8'],
    paddingBlock: {default: spacingVars['--spacing-8'], '@media (min-width: 900px)': en.space16},
  },
  heroText: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-5'], minWidth: 0},
  heroTitle: {
    margin: 0,
    fontFamily: en.fontDisplay,
    fontSize: {default: en.typeDisplaySize, '@media (min-width: 640px)': en.typeDisplayXlSize},
    lineHeight: {default: en.typeDisplayLeading, '@media (min-width: 640px)': en.typeDisplayXlLeading},
    letterSpacing: en.typeDisplayXlTracking,
    fontWeight: 700,
    textWrap: 'balance',
  },
  heroLead: {
    margin: 0,
    maxWidth: '34em',
    fontSize: en.typeBodyLgSize,
    lineHeight: en.typeBodyLgLeading,
    color: colorVars['--color-text-secondary'],
    textWrap: 'pretty',
  },
  heroArt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 0,
    paddingBlockStart: {default: spacingVars['--spacing-6'], '@media (min-width: 900px)': spacingVars['--spacing-10']},
    borderRadius: radiusVars['--radius-page'],
    backgroundColor: colorVars['--color-background-muted'],
    overflow: 'hidden',
  },
  heroNova: {marginBlockEnd: '-6px'},
  floor: {alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: en.grout},
  floorRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(14px, 1fr))',
    gridAutoRows: 14,
    height: 14,
    gap: en.grout,
    overflow: 'hidden',
  },
  tile: {borderRadius: en.radiusTessera},
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacingVars['--spacing-6'],
    paddingBlock: {default: spacingVars['--spacing-10'], '@media (min-width: 900px)': spacingVars['--spacing-12']},
  },
  sectionHead: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-2'], maxWidth: en.widthChat},
  typeRow: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 768px)': '220px minmax(0, 1fr)'},
    alignItems: 'baseline',
    gap: {default: spacingVars['--spacing-1'], '@media (min-width: 768px)': spacingVars['--spacing-8']},
    paddingBlock: spacingVars['--spacing-5'],
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: colorVars['--color-border'],
  },
  spec: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-0-5']},
  specValues: {fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate'},
  sample: {margin: 0, minWidth: 0, overflowWrap: 'anywhere'},
  displayXl: {
    fontFamily: en.fontDisplay,
    fontSize: {default: en.typeDisplaySize, '@media (min-width: 640px)': en.typeDisplayXlSize},
    lineHeight: {default: en.typeDisplayLeading, '@media (min-width: 640px)': en.typeDisplayXlLeading},
    fontWeight: en.typeDisplayXlWeight,
    letterSpacing: en.typeDisplayXlTracking,
  },
  display: {
    fontFamily: en.fontDisplay,
    fontSize: en.typeDisplaySize,
    lineHeight: en.typeDisplayLeading,
    fontWeight: en.typeDisplayWeight,
    letterSpacing: en.typeDisplayTracking,
  },
  title: {
    fontFamily: en.fontDisplay,
    fontSize: en.typeTitleSize,
    lineHeight: en.typeTitleLeading,
    fontWeight: en.typeTitleWeight,
    letterSpacing: en.typeTitleTracking,
  },
  numeral: {
    fontFamily: en.fontDisplay,
    fontSize: en.typeNumeralSize,
    lineHeight: en.typeNumeralLeading,
    fontWeight: en.typeNumeralWeight,
    fontVariantNumeric: 'tabular-nums',
  },
  heading: {fontFamily: en.fontText, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
  bodyLg: {fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading, fontWeight: en.typeBodyLgWeight},
  body: {fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, fontWeight: en.typeBodyWeight},
  label: {fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: en.typeLabelWeight},
  caption: {fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading, fontWeight: en.typeCaptionWeight},
  micro: {
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: en.typeMicroWeight,
    letterSpacing: en.typeMicroTracking,
  },
  math: {fontSize: en.typeMathSize, lineHeight: en.typeMathLeading},
  arabic: {fontFamily: en.fontText, fontSize: en.typeArabicSize, lineHeight: en.typeArabicLeading, fontWeight: en.typeArabicWeight},
  groups: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 900px)': 'repeat(2, minmax(0, 1fr))'},
    columnGap: spacingVars['--spacing-10'],
    rowGap: spacingVars['--spacing-8'],
  },
  group: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-3'], minWidth: 0},
  mosaic: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
    columnGap: en.grout,
    rowGap: spacingVars['--spacing-4'],
  },
  swatch: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-2'], minWidth: 0},
  chip: {
    height: 64,
    borderRadius: en.radiusTessera,
    boxShadow: `inset 0 0 0 1px ${colorVars['--color-border']}`,
  },
  fill: (name: string) => ({backgroundColor: `var(--en-${name})`}),
  hexes: {display: 'flex', flexDirection: 'column', fontVariantNumeric: 'tabular-nums'},
  hexActive: {color: colorVars['--color-text-primary']},
  hexIdle: {color: colorVars['--color-text-secondary']},
  workbench: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 1024px)': 'minmax(0, 1fr) minmax(0, 1fr)'},
    gap: spacingVars['--spacing-6'],
    alignItems: 'start',
  },
  stack: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-5'], minWidth: 0},
  row: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacingVars['--spacing-3']},
  choices: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 640px)': 'repeat(3, minmax(0, 1fr))'},
    gap: spacingVars['--spacing-3'],
  },
  choice: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-2']},
  choiceIcon: {color: colorVars['--color-accent']},
  icons: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      '@media (min-width: 600px)': 'repeat(5, minmax(0, 1fr))',
      '@media (min-width: 1024px)': 'repeat(9, minmax(0, 1fr))',
    },
    gap: en.grout,
    padding: en.grout,
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-border'],
    overflow: 'hidden',
  },
  iconCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingVars['--spacing-2'],
    minHeight: 92,
    paddingInline: spacingVars['--spacing-2'],
    backgroundColor: colorVars['--color-background-surface'],
    color: colorVars['--color-text-primary'],
    textAlign: 'center',
  },
  novas: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      '@media (min-width: 768px)': 'repeat(3, minmax(0, 1fr))',
      '@media (min-width: 1100px)': 'repeat(5, minmax(0, 1fr))',
    },
    gap: spacingVars['--spacing-3'],
  },
  nova: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacingVars['--spacing-3'],
    paddingBlock: spacingVars['--spacing-6'],
    paddingInline: spacingVars['--spacing-3'],
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-background-surface'],
    boxShadow: `inset 0 0 0 1px ${colorVars['--color-border']}`,
    textAlign: 'center',
  },
  novaCalm: {backgroundColor: en.calm, color: en.calmInk, boxShadow: 'none', borderRadius: en.radiusPebble},
  progress: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 900px)': 'minmax(0, 1fr) minmax(0, 1fr)'},
    gap: spacingVars['--spacing-6'],
    alignItems: 'start',
  },
  list: {margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column'},
  masteryRow: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: spacingVars['--spacing-3'],
    paddingBlock: spacingVars['--spacing-3'],
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: colorVars['--color-border'],
  },
  masteryText: {display: 'flex', flexDirection: 'column', minWidth: 0},
  streaks: {
    display: 'grid',
    gridTemplateColumns: {default: '1fr', '@media (min-width: 640px)': 'repeat(2, minmax(0, 1fr))'},
    gap: spacingVars['--spacing-5'],
  },
  maths: {display: 'flex', flexDirection: 'column', gap: spacingVars['--spacing-4'], maxWidth: en.widthChat},
  footer: {paddingBlock: spacingVars['--spacing-10'], color: colorVars['--color-text-secondary']},
});

const TYPE_LOOK: Record<string, stylex.StyleXStyles> = {
  'display-xl': styles.displayXl,
  display: styles.display,
  title: styles.title,
  numeral: styles.numeral,
  heading: styles.heading,
  'body-lg': styles.bodyLg,
  body: styles.body,
  label: styles.label,
  caption: styles.caption,
  micro: styles.micro,
  math: styles.math,
  arabic: styles.arabic,
};

function readParam<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(key);
  return allowed.find(candidate => candidate === value) ?? fallback;
}

function SectionHead({title, children}: {title: string; children: string}) {
  return (
    <div {...stylex.props(styles.sectionHead)}>
      <Heading level={2}>{title}</Heading>
      <Text color="secondary">{children}</Text>
    </div>
  );
}

function TypeScale() {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Typographie">
        Kufam pour les grands moments, Readex Pro pour lire, en latin comme en arabe, et KaTeX pour les formules.
      </SectionHead>
      <div>
        {TYPE_STYLES.map(({name, sample, family}) => {
          const size = local[`--en-type-${name}-size`];
          const leading = local[`--en-type-${name}-leading`];
          const weight = local[`--en-type-${name}-weight`];
          const look = TYPE_LOOK[name];
          return (
            <div key={name} {...stylex.props(styles.typeRow)}>
              <div {...stylex.props(styles.spec)}>
                <Text type="label">{name}</Text>
                <Text type="supporting">
                  <span dir="ltr" {...stylex.props(styles.specValues)}>
                    {FAMILY_NAME[family]} · {size}/{leading} · {weight}
                  </span>
                </Text>
              </div>
              {family === 'math' ? (
                <p {...stylex.props(styles.sample, look)}>
                  <MathText text={sample} />
                </p>
              ) : (
                <p dir={name === 'arabic' ? 'rtl' : undefined} lang={name === 'arabic' ? 'ar' : undefined} {...stylex.props(styles.sample, look)}>
                  {sample}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Colours({mode}: {mode: Mode}) {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Couleurs">
        Chaque teinte existe en Jour et en Nuit. La valeur du mode affiché est en encre, l’autre en gris.
      </SectionHead>
      <div {...stylex.props(styles.groups)}>
        {COLOUR_GROUPS.map(group => (
          <div key={group.title} {...stylex.props(styles.group)}>
            <div>
              <Heading level={3}>{group.title}</Heading>
              <Text type="supporting">{group.note}</Text>
            </div>
            <div {...stylex.props(styles.mosaic)}>
              {group.names.map(name => {
                const [light, dark] = pairOf(name);
                return (
                  <div key={name} {...stylex.props(styles.swatch)}>
                    <div {...stylex.props(styles.chip, styles.fill(name))} />
                    <Text type="label">
                      {name}
                    </Text>
                    <span {...stylex.props(styles.hexes, styles.caption)}>
                      <span {...stylex.props(mode === 'light' ? styles.hexActive : styles.hexIdle)}>Jour <bdi>{light}</bdi></span>
                      <span {...stylex.props(mode === 'dark' ? styles.hexActive : styles.hexIdle)}>Nuit <bdi>{dark}</bdi></span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Primitives() {
  const [pseudo, setPseudo] = useState('yasmine_07');
  const [email, setEmail] = useState('yasmine@exemple.tn');
  const [section, setSection] = useState('math');
  const [style, setStyle] = useState<string>('pas-a-pas');
  const pseudoValid = /^[A-Za-z0-9]{3,30}$/.test(pseudo);
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Composants">
        Les briques Astryx habillées en Tesselle : boutons, champs, choix, cartes, messages et étapes.
      </SectionHead>
      <div {...stylex.props(styles.workbench)}>
        <Card>
          <div {...stylex.props(styles.stack)}>
            <Stepper activeStep={1} label="Préparer ton espace">
              <Step step={0} label="Compte" />
              <Step step={1} label="Bac" />
              <Step step={2} label="Style" />
              <Step step={3} label="Outils" />
            </Stepper>
            <Heading level={3}>Ton compte</Heading>
            <TextInput
              label="Pseudo"
              description="Il apparaît dans les salles d’étude."
              value={pseudo}
              onChange={setPseudo}
              status={pseudoValid ? undefined : {type: 'error', message: 'De 3 à 30 lettres ou chiffres, sans espace ni symbole.'}}
            />
            <TextInput label="Adresse e-mail" type="email" value={email} onChange={setEmail} />
            <Selector label="Section du bac" options={SECTIONS} value={section} onChange={setSection} />
            <div {...stylex.props(styles.row)}>
              <Button variant="primary" label="Continuer" />
              <Button variant="secondary" label="Retour" />
            </div>
          </div>
        </Card>
        <div {...stylex.props(styles.stack)}>
          <Heading level={3}>Ta façon d’apprendre</Heading>
          <div {...stylex.props(styles.choices)}>
            {LEARNING_STYLES.map(choice => (
              <SelectableCard key={choice.id} label={choice.title} isSelected={style === choice.id} onChange={() => setStyle(choice.id)}>
                <div {...stylex.props(styles.choice)}>
                  <span {...stylex.props(styles.choiceIcon)}>
                    <Icon name={choice.icon} size={24} />
                  </span>
                  <Text type="label">{choice.title}</Text>
                  <Text type="supporting">{choice.text}</Text>
                </div>
              </SelectableCard>
            ))}
          </div>
          <Heading level={3}>Actions</Heading>
          <div {...stylex.props(styles.row)}>
            <Button variant="primary" label="Commencer" />
            <Button variant="secondary" label="Un indice" />
            <Button variant="ghost" label="Plus tard" />
            <Button variant="destructive" label="Supprimer mon compte" />
          </div>
          <div {...stylex.props(styles.row)}>
            <Button variant="primary" size="sm" label="Petit" />
            <Button variant="primary" size="lg" label="Grand" />
            <Button variant="primary" label="Envoi…" isLoading />
            <Button variant="secondary" label="Indisponible" isDisabled />
          </div>
        </div>
      </div>
      <div {...stylex.props(styles.workbench)}>
        <div {...stylex.props(styles.stack)}>
          <Heading level={3}>Messages</Heading>
          <Banner status="info" title="Ton manuel est indexé jusqu’au chapitre 6." />
          <Banner status="success" title="Séance enregistrée : 25 min aujourd’hui." />
          <Banner status="warning" title="Nova est très demandé ce soir." description="Réessaie dans 30 secondes : ta question est gardée." />
          <Banner status="error" title="La connexion a été coupée." description="Ta question n’a pas été perdue." />
        </div>
        <div {...stylex.props(styles.stack)}>
          <Heading level={3}>Notifications et cartes</Heading>
          <Toast type="info" isAutoHide={false} autoHideDuration={5000} body="Code de la salle copié." onDismiss={() => {}} />
          <Toast type="error" isAutoHide={false} autoHideDuration={5000} body="Le message n’a pas pu partir." onDismiss={() => {}} />
          <Card variant="muted">
            <Text>Une carte calme, pour un aparté : la source, un rappel de cours, une consigne.</Text>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Icons() {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Icônes">Le jeu de Nova, trait de 1,75 sur une grille de 24, repris tel quel.</SectionHead>
      <div {...stylex.props(styles.icons)}>
        {(Object.keys(iconPaths) as IconName[]).map(name => (
          <div key={name} {...stylex.props(styles.iconCell)}>
            <Icon name={name} size={24} />
            <Text type="supporting">{name}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}

function Nova() {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Nova">L’axolotl qui accompagne la révision, dans ses cinq humeurs.</SectionHead>
      <div {...stylex.props(styles.novas)}>
        {MASCOTS.map(({mood, name, use}) => (
          <figure key={mood} {...stylex.props(styles.nova, mood === 'calm' && styles.novaCalm)}>
            <Mascot mood={mood} size={128} />
            <figcaption>
              <Text type="label" display="block" color="inherit">
                {name}
              </Text>
              <Text type="supporting" display="block" color="inherit">
                {use}
              </Text>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Progress() {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Maîtrise et série">
        Quatre tesselles par chapitre, et un jasmin qui pousse avec les jours de travail, sans flamme ni perte.
      </SectionHead>
      <div {...stylex.props(styles.progress)}>
        <ul {...stylex.props(styles.list)}>
          {CHAPTERS.map(({chapter, level, detail}) => (
            <li key={chapter} {...stylex.props(styles.masteryRow)}>
              <MasteryTessera level={level} size={28} label="" />
              <span {...stylex.props(styles.masteryText)}>
                <Text type="label">{chapter}</Text>
                <Text type="supporting">{detail}</Text>
              </span>
              <Text type="label" color="secondary">
                {MASTERY_LABEL[level]}
              </Text>
            </li>
          ))}
        </ul>
        <div {...stylex.props(styles.streaks)}>
          {[0, 2, 5, 9, 16, 30].map(days => (
            <Streak key={days} days={days} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Maths() {
  return (
    <section {...stylex.props(styles.section)}>
      <SectionHead title="Formules">Les maths restent de gauche à droite, même dans une page en arabe.</SectionHead>
      <div {...stylex.props(styles.maths, styles.bodyLg)}>
        <MathText text="Soit $f(x) = x^2 - 3x + 2$, alors $f'(x) = 2x - 3$." />
        <MathText text="On cherche $P_A(B)$, la probabilité que $B$ se réalise sachant $A$ : $$P_A(B) = \frac{P(A \cap B)}{P(A)}$$" />
        <MathText text="Une intégrale : $\int_0^1 x\,dx = \tfrac{1}{2}$, et un prix de 3 \$ reste du texte." />
      </div>
    </section>
  );
}

export default function ThemeGallery(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>(() => readParam('mode', ['light', 'dark'], 'light'));
  const [dir, setDir] = useState<Dir>(() => readParam('dir', ['ltr', 'rtl'], 'ltr'));

  useEffect(() => {
    document.documentElement.dir = dir;
    document.title = 'Tesselle · Nova';
    const params = new URLSearchParams(window.location.search);
    params.set('mode', mode);
    params.set('dir', dir);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [mode, dir]);

  return (
    <Theme theme={tesselleTheme} mode={mode}>
      <div dir={dir} {...stylex.props(styles.page)}>
        <div {...stylex.props(styles.frame)}>
          <header {...stylex.props(styles.bar)}>
            <span {...stylex.props(styles.brand)}>
              <Mark size={32} label="" />
              <span {...stylex.props(styles.wordmark)}>Nova</span>
            </span>
            <span {...stylex.props(styles.controls)}>
              <SegmentedControl label="Thème" value={mode} onChange={value => setMode(value === 'dark' ? 'dark' : 'light')} size="sm">
                <SegmentedControlItem value="light" label="Jour" icon={<Icon name="sun" size={16} />} />
                <SegmentedControlItem value="dark" label="Nuit" icon={<Icon name="moon" size={16} />} />
              </SegmentedControl>
              <SegmentedControl label="Sens de lecture" value={dir} onChange={value => setDir(value === 'rtl' ? 'rtl' : 'ltr')} size="sm">
                <SegmentedControlItem value="ltr" label="LTR" />
                <SegmentedControlItem value="rtl" label="RTL" />
              </SegmentedControl>
            </span>
          </header>
          <main>
            <div {...stylex.props(styles.hero)}>
              <div {...stylex.props(styles.heroText)}>
                <h1 {...stylex.props(styles.heroTitle)}>Tesselle</h1>
                <p {...stylex.props(styles.heroLead)}>
                  Le thème de Nova pour Astryx. Chaux le jour, nuit le soir : trois minéraux, argile, faïence et ocre, un crépuscule pour le bien‑être, et la harissa
                  pour les vraies erreurs seulement.
                </p>
                <div {...stylex.props(styles.row)}>
                  <Button variant="primary" size="lg" label="C’est parti" endContent={<Icon name="arrow-right" size={20} />} />
                  <Button variant="ghost" size="lg" label="J’ai déjà un compte" />
                </div>
              </div>
              <div {...stylex.props(styles.heroArt)} aria-hidden="true">
                <div {...stylex.props(styles.heroNova)}>
                  <Mascot mood="idle" size={220} />
                </div>
                <div {...stylex.props(styles.floor)}>
                  {FLOOR.map((row, rowIndex) => (
                    <div key={rowIndex} {...stylex.props(styles.floorRow)}>
                      {Array.from({length: 64}, (_, index) => (
                        <span key={index} {...stylex.props(styles.tile, styles.fill(row[index % row.length] ?? 'line'))} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <TypeScale />
            <Colours mode={mode} />
            <Primitives />
            <Icons />
            <Nova />
            <Progress />
            <Maths />
          </main>
          <footer {...stylex.props(styles.footer)}>
            <Text type="supporting">Page de développement : /__theme. Elle disparaît des builds de production.</Text>
          </footer>
        </div>
      </div>
    </Theme>
  );
}
