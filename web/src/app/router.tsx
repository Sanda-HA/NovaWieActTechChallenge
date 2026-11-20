import {LinkProvider} from '@astryxdesign/core/Link';
import {createBrowserRouter, Link, Outlet, type RouteObject} from 'react-router';
import {capturePendingCode} from '../lib/rooms-store';
import {MosaicGround} from '../ui/MosaicGround';
import {OnboardingGuard, RequireSignedIn, RootRedirect, SessionGate} from './guards';

/**
 * Reads `#rejoindre=CODE` (the invite link rooms-store builds) into this tab's storage and drops it from
 * the URL, so a refresh does not capture it again. Runs once, before the router reads the location.
 */
export function captureInvite(location: Location = window.location, history: History = window.history): void {
  capturePendingCode(location, {replaceState: () => history.replaceState(history.state, '', '/')});
}

function Root(): React.JSX.Element {
  return (
    <LinkProvider component={Link}>
      <MosaicGround />
      <Outlet />
    </LinkProvider>
  );
}

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{path: '__theme', lazy: async () => ({Component: (await import('../dev/ThemeGallery')).default})}]
  : [];

export const appRoutes: RouteObject[] = [
  {
    element: <Root />,
    HydrateFallback: () => null,
    children: [
      ...devRoutes,
      {
        element: <SessionGate />,
        children: [
          {index: true, element: <RootRedirect />},
          {
            element: <OnboardingGuard />,
            children: [
              {
                lazy: async () => ({Component: (await import('./OnboardingLayout')).OnboardingLayout}),
                children: [
                  {path: 'bienvenue', lazy: () => import('../screens/onboarding/Bienvenue')},
                  {path: 'compte', lazy: () => import('../screens/onboarding/Compte')},
                  {path: 'bac', lazy: () => import('../screens/onboarding/Bac')},
                  {path: 'style', lazy: () => import('../screens/onboarding/Style')},
                  {path: 'outils', lazy: () => import('../screens/onboarding/Outils')},
                  {path: 'diagnostic', lazy: () => import('../screens/onboarding/Diagnostic')},
                  {path: 'plan', lazy: () => import('../screens/onboarding/Plan')},
                ],
              },
            ],
          },
          {
            element: <RequireSignedIn />,
            children: [
              {
                lazy: async () => ({Component: (await import('./AppLayout')).AppLayout}),
                children: [
                  {path: 'accueil', lazy: () => import('../screens/accueil/Accueil')},
                  {path: 'tuteur', lazy: () => import('../screens/tuteur/Tuteur')},
                  {path: 'carte', lazy: () => import('../screens/carte/Carte')},
                  {path: 'seances', lazy: () => import('../screens/seances/Seances')},
                  {path: 'salle/:id/duel/:duelId?', lazy: () => import('../screens/duel/Duel')},
                  {path: 'salle/:id?', lazy: () => import('../screens/salle/Salle')},
                  {path: 'offres', lazy: () => import('../screens/plans/Plans')},
                  {path: 'reglages', lazy: () => import('../screens/reglages/Reglages')},
                ],
              },
            ],
          },
          {path: '*', lazy: () => import('../screens/NotFound')},
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(appRoutes);
