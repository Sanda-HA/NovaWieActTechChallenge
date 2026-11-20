import {defineConfig} from '@lingui/cli';
import {formatter} from '@lingui/format-po';

export default defineConfig({
  sourceLocale: 'fr',
  locales: ['fr', 'en', 'ar'],
  catalogs: [{path: '<rootDir>/src/i18n/locales/{locale}', include: ['<rootDir>/src'], exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.*']}],
  format: formatter({lineNumbers: false}),
});
