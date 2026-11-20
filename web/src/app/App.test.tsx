import {render, screen} from '@testing-library/react';
import {createMemoryRouter} from 'react-router';
import {beforeAll, describe, expect, it} from 'vitest';
import {App} from './App';
import {createQueryClient} from './queryClient';
import {appRoutes} from './router';
import {createSession} from './session';
import {memoryStorage, PRELOAD_TIMEOUT, preloadLazyRoutes, signedInBackend, stubFetch} from './testing';

beforeAll(() => preloadLazyRoutes(appRoutes), PRELOAD_TIMEOUT);

describe('App', () => {
  it('opens on the welcome screen inside the theme', async () => {
    const session = createSession({fetchImpl: stubFetch(signedInBackend()).fetchImpl, storage: memoryStorage()});
    render(<App session={session} router={createMemoryRouter(appRoutes)} queryClient={createQueryClient()} />);
    expect(await screen.findByRole('button', {name: 'C’est parti'})).toBeTruthy();
    expect(document.documentElement.getAttribute('data-astryx-theme')).toBeTruthy();
  });
});
