import {defineConfig, devices} from '@playwright/test';
import {python} from './python';
import {e2eDatabaseUrl} from './helpers';

const target = process.env.EDNOVA_APP ?? 'web';
if (target !== 'web') throw new Error(`EDNOVA_APP must be "web", got "${target}".`);

const webPort = Number(process.env.EDNOVA_E2E_PORT ?? 4176);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  globalSetup: './global-setup.ts',
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure'},
  projects: [
    {name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}},
    {name: 'mobile', testMatch: /(mobile|smoke)\.spec\.ts/, use: {...devices['Pixel 7'], viewport: {width: 375, height: 812}}},
  ],
  webServer: [
    {
      command: `"${python}" -m uvicorn src.main:app --port 9998`,
      cwd: '../Backend',
      url: 'http://127.0.0.1:9998/openapi.json',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: e2eDatabaseUrl,
        SECRET_KEY: 'e2e-only',
        AGENT_URL: 'http://127.0.0.1:8100',
      },
    },
    {
      command: 'npm --prefix ../web run e2e:serve',
      url: `http://127.0.0.1:${webPort}/`,
      reuseExistingServer: false,
      // e2e:serve runs a full production build first (about 100 s on Windows).
      timeout: 300_000,
      env: {},
    },
  ],
});
