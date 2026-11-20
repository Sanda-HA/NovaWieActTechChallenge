import * as stylex from '@stylexjs/stylex';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useState} from 'react';
import {Navigate, Outlet, useLocation} from 'react-router';
import {en} from '../theme/ednova.stylex';
import {ErrorState} from '../ui/ErrorState';
import {Mascot} from '../ui/Mascot';
import {useSession} from './session';

const styles = stylex.create({
  center: {display: 'grid', placeItems: 'center', alignContent: 'center', gap: en.space4, minBlockSize: '50dvh'},
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize},
});

const RESTORE_DELAY_MS = 300;

/** Nothing for a fast restore; past the delay, a spinner announced to screen readers. */
function RestoringState(): React.JSX.Element | null {
  const {t} = useLingui();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), RESTORE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" {...stylex.props(styles.center)}>
      {visible && (
        <>
          <Mascot mood="thinking" size={88} />
          <p {...stylex.props(styles.text)}>{t`Chargement de ta session…`}</p>
        </>
      )}
    </div>
  );
}

/** Holds every route until the stored token is confirmed, and offers a retry if the backend is down. */
export function SessionGate(): React.JSX.Element | null {
  const {status, restore} = useSession();
  const {t} = useLingui();
  if (status === 'restoring') return <RestoringState />;
  if (status === 'unavailable') return <ErrorState message={t`Chargement indisponible. Réessaie.`} onRetry={() => void restore()} />;
  return <Outlet />;
}

export function RootRedirect(): React.JSX.Element {
  const {status} = useSession();
  return <Navigate to={status === 'signedIn' ? '/accueil' : '/bienvenue'} replace />;
}

/** The app screens: signed out goes to /compte. */
export function RequireSignedIn(): React.JSX.Element {
  const {status} = useSession();
  return status === 'signedIn' ? <Outlet /> : <Navigate to="/compte" replace />;
}

const OPEN_STEPS = new Set(['/bienvenue', '/compte']);

/**
 * The onboarding steps. `/bienvenue` and `/compte` are open to everyone; the later steps need the account
 * that `/compte` creates. A learner who is signed in and not onboarding goes to /accueil (ui-preview's route()).
 */
export function OnboardingGuard(): React.JSX.Element {
  const {status, onboarding} = useSession();
  const open = OPEN_STEPS.has(useLocation().pathname);
  if (status === 'signedIn' && !onboarding) return <Navigate to="/accueil" replace />;
  if (status !== 'signedIn' && !open) return <Navigate to="/compte" replace />;
  return <Outlet />;
}
