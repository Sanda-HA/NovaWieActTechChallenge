import * as stylex from '@stylexjs/stylex';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {useLingui} from '@lingui/react/macro';
import {useLayoutEffect} from 'react';
import {Link, Outlet, useLocation} from 'react-router';
import {OnboardingProvider, useOnboarding} from '../screens/onboarding/state';
import {stepIndex, STEPS} from '../screens/onboarding/steps';
import {toLocale} from '../lib/i18n-store';
import {en} from '../theme/ednova.stylex';
import {ErrorBanner} from '../ui/ErrorBanner';
import {Mark} from '../ui/Mark';
import {ThemeToggle} from './ThemeToggle';

const styles = stylex.create({
  page: {
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto auto auto 1fr auto',
    minBlockSize: '100dvh',
    inlineSize: '100%',
    maxInlineSize: 1152,
    marginInline: 'auto',
    paddingInline: {default: en.space4, '@media (width >= 640px)': en.space8},
    paddingBlockEnd: `calc(${en.space8} + env(safe-area-inset-bottom, 0px))`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: en.space3,
    minBlockSize: en.space16,
  },
  home: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: en.space2,
    borderRadius: en.radiusMd,
    color: en.ink,
    textDecoration: 'none',
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 4,
  },
  wordmark: {
    display: {default: 'none', '@media (width >= 640px)': 'inline'},
    fontFamily: en.fontDisplay,
    fontSize: '1.375rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1,
  },
  spacer: {flexGrow: 1},
  progress: {paddingBlockEnd: en.space2},
  notice: {paddingBlockEnd: en.space4},
  status: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  main: {display: 'grid', alignContent: 'start', minInlineSize: 0, paddingBlockStart: en.space4},
  footer: {
    display: {default: 'none', '@media (width >= 1024px)': 'block'},
    marginBlockStart: en.space10,
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});

function Frame(): React.JSX.Element {
  const {t, i18n} = useLingui();
  const {pathname} = useLocation();
  useLayoutEffect(() => {
    if (window.scrollY > 0) window.scrollTo({top: 0, behavior: 'instant'});
  }, [pathname]);
  const {lang, chooseLanguage, saveStatus} = useOnboarding();
  const index = stepIndex(pathname);
  const position = index + 1;
  const total = STEPS.length;
  return (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.header)}>
        <Link to="/bienvenue" aria-label={t`Nova, revenir au début`} {...stylex.props(styles.home)}>
          <Mark size={32} label="" />
          <span aria-hidden="true" {...stylex.props(styles.wordmark)}>
            Nova
          </span>
        </Link>
        <span {...stylex.props(styles.spacer)} />
        <SegmentedControl label={t`Langue`} size="sm" value={lang} onChange={value => chooseLanguage(toLocale(value))}>
          <SegmentedControlItem value="fr" label="Français" />
          <SegmentedControlItem value="en" label="English" />
          <SegmentedControlItem value="ar" label="العربية" />
        </SegmentedControl>
        <ThemeToggle />
      </header>
      {index >= 0 ? (
        <div {...stylex.props(styles.progress)}>
          <Stepper
            activeStep={index}
            label={t`Étape ${position} sur ${total}`}
            density="compact"
            horizontalOptions={{minimumStepWidth: 104, collapsedVariant: 'withLabel'}}>
            {STEPS.map((step, position) => (
              <Step key={step.id} step={position} indicator="none" label={i18n._(step.name)} />
            ))}
          </Stepper>
        </div>
      ) : (
        <div />
      )}
      <div {...stylex.props(styles.notice)}>
        {saveStatus === 'saving' && (
          <p role="status" {...stylex.props(styles.status)}>
            {t`Enregistrement…`}
          </p>
        )}
        {saveStatus === 'failed' && <ErrorBanner message={t`Tes choix n’ont pas pu être enregistrés. Réessaie.`} />}
      </div>
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
      <p {...stylex.props(styles.footer)}>{t`Prototype : contenus, pages du manuel et résultats d’exemple.`}</p>
    </div>
  );
}

/** Frame of the onboarding steps: brand, language and theme, the step progress, and the choices they share. */
export function OnboardingLayout(): React.JSX.Element {
  return (
    <OnboardingProvider>
      <Frame />
    </OnboardingProvider>
  );
}
