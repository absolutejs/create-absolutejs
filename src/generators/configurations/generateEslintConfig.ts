import type { Frontend } from '../../types';

/** Correctness defaults; project-specific formatting belongs in Prettier. */
export const generateEslintConfig = (frontends: Frontend[]) => `
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import absolute from 'eslint-plugin-absolute';
${frontends.includes('react') ? "import reactHooks from 'eslint-plugin-react-hooks';" : ''}

export default defineConfig([
  // The copied HTMX distribution is third-party minified runtime code.
  { ignores: ['src/frontend/**/htmx.min.js', 'node_modules/**', 'build/**', 'dist/**', '.absolutejs/**', '.data/**', '**/.absolutejs-hmr-*', 'drizzle/**'] },
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' } },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    plugins: { absolute },
    rules: {
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-check': true, 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true }],
      'absolute/no-chained-type-assertions': 'error',
      'absolute/no-unsafe-schema-types': 'error',
      'absolute/prefer-drizzle-query-builders': 'error',
      'absolute/elysia-composition-boundaries': 'error',
      'absolute/no-nondeterministic-render': 'error',
      'absolute/button-icon-is-hidden': 'error',
      'absolute/icon-button-has-accessible-name': 'error',
      'absolute/loading-indicator-has-aria-busy': 'error',
      'absolute/progressbar-has-state': 'error',
    },
  },
  {
    files: ['src/backend/**/*.{ts,tsx}'],
    rules: { 'absolute/elysia-no-response-return': 'error' },
  },
  {
    files: ['src/frontend/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.name='fetch']", message: 'Use a directly typed Eden subapp client.' },
        { selector: "CallExpression[callee.property.name='fetch']", message: 'Use a directly typed Eden subapp client.' },
      ],
      ${frontends.includes('react') ? "'absolute/eden-requires-react-query': 'error'," : ''}
    },
  },
  { files: ['**/*.{html,vue,svelte,gjs,gts}'], plugins: { absolute }, processor: 'absolute/template-source' },
  ${
		frontends.includes('react')
			? `{
    // React Hooks rules do not apply to Angular's unrelated usePageContext API.
    files: ['src/frontend/**/*.{tsx,jsx}', 'src/frontend/**/hooks/**/*.{ts,js}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },`
			: ''
  }
]);
`;
