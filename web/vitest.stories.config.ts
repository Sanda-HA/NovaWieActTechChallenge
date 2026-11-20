import path from 'node:path';
import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';
import {lingui} from '@lingui/vite-plugin';
import {storybookTest} from '@storybook/addon-vitest/vitest-plugin';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Separate from vitest.config.ts: the unit suite stays in jsdom, the play functions run in a real browser.
export default defineConfig({
  plugins: [
    ...astryxStylex({layers: {product: 'ednova'}}),
    lingui({macroTransform: true}),
    react(),
    storybookTest({configDir: path.join(dirname, '.storybook')}),
  ],
  test: {
    name: 'stories',
    // The first play function of a run waits for a cold transform of the app (~100 s); files run one at a time so that cost is paid once.
    testTimeout: 180_000,
    fileParallelism: false, // one browser session over every story ran out of memory: the npm script runs src/ui and src/screens apart
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: 'chromium'}],
    },
  },
});
