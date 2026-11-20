import '../src/styles/global.css';
import '../src/theme/fonts.css';
import '../src/theme/built/tesselle.css';

import {Theme} from '@astryxdesign/core/theme';
import type {Decorator, Preview} from '@storybook/react-vite';
import {configure} from 'storybook/test';
import {I18nRoot} from '../src/i18n';
import {tesselleTheme} from '../src/theme/built/tesselle.js';

const withTesselle: Decorator = (Story, context) => {
  const mode = context.globals.mode === 'nuit' ? 'dark' : 'light';
  const rtl = context.globals.dir === 'rtl';
  return (
    <Theme theme={tesselleTheme} mode={mode}>
      <I18nRoot localeOverride={rtl ? 'ar' : undefined}>
        <div dir={rtl ? 'rtl' : 'ltr'}>
          <Story />
        </div>
      </I18nRoot>
    </Theme>
  );
};

// A screen's lazy chunk transforms on first use, which takes tens of seconds on a cold cache and outlasts Testing Library's 1 s default.
export const beforeAll = () => {
  configure({asyncUtilTimeout: 120_000});
};

const preview: Preview = {
  decorators: [withTesselle],
  initialGlobals: {mode: 'jour', dir: 'ltr'},
  globalTypes: {
    mode: {
      description: 'Jour / Nuit',
      toolbar: {title: 'Mode', icon: 'circlehollow', dynamicTitle: true, items: [{value: 'jour', title: 'Jour'}, {value: 'nuit', title: 'Nuit'}]},
    },
    dir: {
      description: 'Direction',
      toolbar: {title: 'Direction', icon: 'transfer', dynamicTitle: true, items: [{value: 'ltr', title: 'LTR'}, {value: 'rtl', title: 'RTL'}]},
    },
  },
  parameters: {layout: 'fullscreen', controls: {disable: true}, backgrounds: {disable: true}},
};

export default preview;
