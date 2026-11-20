import {Theme} from '@astryxdesign/core/theme';
import {QueryClientProvider, type QueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {RouterProvider, type createBrowserRouter} from 'react-router';
import {I18nRoot} from '../i18n';
import {tesselleTheme} from '../theme/built/tesselle.js';
import {SessionProvider, useStore, type Session} from './session';
import {themeMode} from './themeMode';

export interface AppProps {
  session: Session;
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
}

export function App({session, router, queryClient}: AppProps): React.JSX.Element {
  const mode = useStore(themeMode);
  // A learner's cached reads must not outlive their session.
  useEffect(() => {
    const stop = session.subscribe(() => {
      if (session.getSnapshot().status === 'signedOut') queryClient.clear();
    });
    return () => void stop();
  }, [session, queryClient]);
  // A 403 pro_required means the cached plan is stale: show Free at once, then let the server confirm.
  useEffect(() => {
    const stop = session.onProRequired(() => {
      void queryClient.cancelQueries({queryKey: ['profile'], exact: true});
      queryClient.setQueryData<{student_plan?: string}>(['profile'], profile => profile && {...profile, student_plan: 'free'});
      void queryClient.invalidateQueries({queryKey: ['profile']});
    });
    const refresh = () => {
      if (session.getSnapshot().status === 'signedIn') {
        void queryClient.invalidateQueries({queryKey: ['profile'], exact: true}, {cancelRefetch: false});
      }
    };
    window.addEventListener('focus', refresh);
    return () => {
      stop();
      window.removeEventListener('focus', refresh);
    };
  }, [session, queryClient]);
  return (
    <Theme theme={tesselleTheme} mode={mode}>
      <I18nRoot>
        <QueryClientProvider client={queryClient}>
          <SessionProvider session={session}>
            <RouterProvider router={router} />
          </SessionProvider>
        </QueryClientProvider>
      </I18nRoot>
    </Theme>
  );
}
