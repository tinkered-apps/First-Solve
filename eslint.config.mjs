// ESLint's recommended rules, run by `npm test`. The app has no build step, so
// this is the only thing that reads every file before it ships.

import js from '@eslint/js';
import globals from 'globals';

export default [
  // public/vendor/ is cubing.js, copied in as released.
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '.wrangler/', 'public/vendor/'] },

  js.configs.recommended,
  {
    rules: {
      // An unused name in `catch (e)` and an empty `catch` block are how the app ignores a blocked localStorage.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
    // A top-level declaration in a classic script is its interface to the other scripts.
    rules: { 'no-unused-vars': ['error', { vars: 'local', caughtErrors: 'none' }] },
  },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },

  { files: ['scripts/**', '*.js'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
  // Playwright specs run in Node and hand callbacks to the page.
  { files: ['e2e/**'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } } },
];
