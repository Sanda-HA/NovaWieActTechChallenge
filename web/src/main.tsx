import './styles/global.css';
import './theme/fonts.css';
import './theme/built/tesselle.css';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './app/App';
import {createQueryClient} from './app/queryClient';
import {captureInvite, createAppRouter} from './app/router';
import {createSession} from './app/session';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

captureInvite();
const session = createSession();
const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(root).render(
  <StrictMode>
    <App session={session} router={router} queryClient={queryClient} />
  </StrictMode>,
);
