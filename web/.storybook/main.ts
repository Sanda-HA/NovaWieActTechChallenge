import type {StorybookConfig} from '@storybook/react-vite';
import type {PluginOption} from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-vitest'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  core: {disableTelemetry: true},
  // The app's vite.config.ts (StyleX, Lingui macro) is reused; its dev-server middleware is not.
  viteFinal: config => ({
    ...config,
    plugins: (config.plugins ?? []).filter((plugin: PluginOption) => !(plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'ednova-server')),
  }),
};

export default config;
