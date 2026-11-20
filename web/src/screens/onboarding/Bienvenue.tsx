import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useRef} from 'react';
import {useNavigate} from 'react-router';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {useOnboarding} from './state';
import {NextArrow} from './StepFrame';
import {STEPS} from './steps';

const styles = stylex.create({
  hero: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 1024px)': 'minmax(0, 1.1fr) minmax(0, 1fr)'},
    alignItems: 'center',
    gap: {default: en.space8, '@media (width >= 1024px)': en.space16},
    paddingBlockStart: {default: en.space2, '@media (width >= 1024px)': en.space8},
    paddingBlockEnd: en.space10,
    minInlineSize: 0,
  },
  copy: {display: 'grid', gap: en.space6, minInlineSize: 0, order: {default: 2, '@media (width >= 1024px)': 1}},
  eyebrow: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
  },
  title: {
    margin: 0,
    overflowWrap: 'anywhere',
    textWrap: 'balance',
    fontFamily: en.fontDisplay,
    fontSize: {default: '2.5rem', '@media (width >= 1024px)': '3.75rem'},
    lineHeight: {default: '2.75rem', '@media (width >= 1024px)': '3.875rem'},
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: en.ink,
    outline: '0 none',
  },
  lead: {
    margin: 0,
    maxInlineSize: '54ch',
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeBodyLgSize,
    lineHeight: en.typeBodyLgLeading,
  },
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space3},
  preview: {display: 'grid', gap: en.space2},
  previewLabel: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: {default: 'repeat(2, minmax(0, 1fr))', '@media (width >= 640px)': 'repeat(3, minmax(0, 1fr))'},
    gap: `${en.space2} ${en.space6}`,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space2,
    minInlineSize: 0,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
  },
  tile: {
    flexShrink: 0,
    inlineSize: 14,
    blockSize: 14,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    borderRadius: en.radiusTessera,
  },
  stage: {
    display: 'grid',
    justifyItems: 'center',
    gap: en.space5,
    inlineSize: '100%',
    maxInlineSize: 420,
    justifySelf: 'center',
    order: {default: 1, '@media (width >= 1024px)': 2},
    paddingBlockStart: en.space6,
    paddingBlockEnd: en.space5,
    paddingInline: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  pieces: {display: 'flex', gap: 3},
  piece: {
    inlineSize: 22,
    blockSize: 22,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    borderRadius: en.radiusTessera,
  },
  pieceFirst: {borderColor: en.argile, backgroundColor: en.argile},
});

export function Component(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const navigate = useNavigate();
  const {patch} = useOnboarding();
  const heading = useRef<HTMLHeadingElement>(null);
  const wide = useMediaQuery('(width >= 1024px)');
  useEffect(() => heading.current?.focus({preventScroll: true}), []);

  const start = (wantsLogin: boolean) => {
    patch({wantsLogin});
    void navigate('/compte');
  };

  return (
    <div {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.copy)}>
        <p {...stylex.props(styles.eyebrow)}>{t`Ton compagnon de révision`}</p>
        <Heading ref={heading} id="step-title" level={1} tabIndex={-1} xstyle={styles.title}>
          {t`Salut, moi c’est Nova.`}
        </Heading>
        <p {...stylex.props(styles.lead)}>
          {t`Révise tes matières, pose des questions et entraîne-toi à expliquer avec tes propres mots. Préparons ton espace.`}
        </p>
        <div {...stylex.props(styles.actions)}>
          <Button variant="primary" size="lg" label={t`C’est parti`} endContent={<NextArrow />} onClick={() => start(false)} />
          <Button variant="ghost" size="lg" label={t`J’ai déjà un compte`} onClick={() => start(true)} />
        </div>
        <div {...stylex.props(styles.preview)}>
          <p {...stylex.props(styles.previewLabel)}>{t`Ce qu’on va préparer ensemble`}</p>
          <ol {...stylex.props(styles.steps)}>
            {STEPS.map(step => (
              <li key={step.id} {...stylex.props(styles.step)}>
                <span aria-hidden="true" {...stylex.props(styles.tile)} />
                {i18n._(step.name)}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div {...stylex.props(styles.stage)}>
        <Mascot mood="wave" breathe size={wide ? 300 : 200} label={t`Nova l’axolotl te fait coucou`} />
        <div aria-hidden="true" {...stylex.props(styles.pieces)}>
          {STEPS.map((step, index) => (
            <span key={step.id} {...stylex.props(styles.piece, index === 0 && styles.pieceFirst)} />
          ))}
        </div>
      </div>
    </div>
  );
}
