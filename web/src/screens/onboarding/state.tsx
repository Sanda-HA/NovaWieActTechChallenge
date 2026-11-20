import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {useSession} from '../../app/session';
import {getLocale, setLocale, subscribeLocale, type Locale} from '../../lib/i18n-store';
import {saveOnboardingPreferences} from '../../lib/onboarding-preferences';
import type {OnboardingChoices} from '../../lib/types';
import {SAVED_ON_LEAVING, type StepId} from './steps';
import type {DiagnosticOutcome} from './diagnosticBank';

export type SaveStatus = 'idle' | 'saving' | 'failed';

interface Picks {
  section?: string;
  style: OnboardingChoices['style'];
  tools: Set<string>;
  answers: Record<string, string>;
  outcome: DiagnosticOutcome | null;
  wantsLogin: boolean;
  pseudo: string;
}

const fresh = (pseudo: string | null): Picks => ({style: null, tools: new Set(), answers: {}, outcome: null, wantsLogin: false, pseudo: pseudo ?? ''});

export interface Onboarding extends Picks {
  lang: Locale;
  saveStatus: SaveStatus;
  chooseLanguage(lang: Locale): void;
  patch(change: Partial<Picks>): void;
  toggleTool(id: string, on: boolean): void;
  /** Moves from one step to the next, saving the step's choices first when it has any. */
  advance(from: StepId, to: StepId): Promise<void>;
  /** Saves every choice, then leaves onboarding for Accueil. Resolves false when the save failed. */
  finish(): Promise<boolean>;
}

const OnboardingContext = createContext<Onboarding | null>(null);

export function OnboardingProvider({children}: {children: ReactNode}): React.JSX.Element {
  const {api, status, pseudo: sessionPseudo, finishOnboarding} = useSession();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  const [picks, setPicks] = useState(() => fresh(sessionPseudo));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const pending = useRef(false);
  const languageSave = useRef<Promise<unknown>>(Promise.resolve());
  const signedIn = useRef(false);
  signedIn.current = status === 'signedIn';

  useEffect(() => {
    if (!pending.current) setSaveStatus('idle');
  }, [pathname]);

  // An expired session must not leave the previous learner's choices on a shared device.
  useEffect(() => {
    if (status === 'signedOut') setPicks(fresh(null));
  }, [status]);

  const chooseLanguage = useCallback(
    (lang: Locale) => {
      setLocale(lang);
      if (!signedIn.current) return;
      // Rapid toggles stay in order; the next step's save also retries the current choice.
      languageSave.current = languageSave.current.then(() => api.request('PUT', '/me/profile', {json: {reply_language: lang}})).catch(() => {});
    },
    [api],
  );

  const choices = (current: Picks): OnboardingChoices => ({lang: getLocale(), section: current.section, style: current.style, tools: current.tools});

  const value = useMemo<Onboarding>(
    () => ({
      ...picks,
      lang: locale,
      saveStatus,
      chooseLanguage,
      patch: change => setPicks(current => ({...current, ...change})),
      toggleTool: (id, on) =>
        setPicks(current => {
          const tools = new Set(current.tools);
          if (on) tools.add(id);
          else tools.delete(id);
          return {...current, tools};
        }),
      async advance(from, to) {
        if (pending.current) return;
        if (SAVED_ON_LEAVING[from] !== to) {
          setSaveStatus('idle');
          void navigate(`/${to}`);
          return;
        }
        pending.current = true;
        setSaveStatus('saving');
        try {
          await languageSave.current;
          await saveOnboardingPreferences(api, choices(picks), from);
          setSaveStatus('idle');
          void navigate(`/${to}`);
        } catch (error) {
          if ((error as Error).name !== 'AbortError') setSaveStatus('failed');
        } finally {
          pending.current = false;
        }
      },
      async finish() {
        if (pending.current) return false;
        pending.current = true;
        try {
          await languageSave.current;
          await saveOnboardingPreferences(api, choices(picks));
          finishOnboarding();
          void navigate('/accueil');
          return true;
        } catch (error) {
          if ((error as Error).name === 'AbortError') return true;
          return false;
        } finally {
          pending.current = false;
        }
      },
    }),
    [picks, locale, saveStatus, chooseLanguage, api, navigate, finishOnboarding],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): Onboarding {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding needs an OnboardingProvider');
  return value;
}
