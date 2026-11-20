import {QueryClientProvider} from '@tanstack/react-query';
import {useMemo} from 'react';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {createQueryClient} from '../app/queryClient';
import {appRoutes} from '../app/router';
import {createSession, SessionProvider, type Session} from '../app/session';
import {memoryStorage} from '../app/testing';
import type {ScenarioName} from '../fixtures';
import {backendFor} from './backend';

export interface StageProps {
  route: string;
  scenario?: ScenarioName;
  /** Signed in with the account form and still on the onboarding steps. */
  onboarding?: boolean;
  /** No token: the guards decide where the learner lands. */
  signedOut?: boolean;
  setup?: (session: Session) => void;
}

/** The app's real routes and guards over a stubbed backend, so a story renders what the app renders. */
export function ScreenStage({route, scenario = 'success', onboarding = false, signedOut = false, setup}: StageProps): React.JSX.Element {
  const stage = useMemo(() => {
    const session = createSession({
      fetchImpl: backendFor(scenario),
      storage: memoryStorage(signedOut || onboarding ? null : 'storybook-token'),
    });
    if (onboarding) session.signedIn('eleve01', {onboarding: true});
    setup?.(session);
    return {session, queryClient: createQueryClient(), router: createMemoryRouter(appRoutes, {initialEntries: [route]})};
  }, [route, scenario, onboarding, signedOut, setup]);
  return (
    <QueryClientProvider client={stage.queryClient}>
      <SessionProvider session={stage.session}>
        <RouterProvider router={stage.router} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
