import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';
import {lingui} from '@lingui/vite-plugin';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [...astryxStylex({layers: {product: 'ednova'}}), lingui({macroTransform: true}), react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'scripts/**/*.test.ts'],
    css: false,
    setupFiles: ['src/test-setup.ts'],
  },
});
