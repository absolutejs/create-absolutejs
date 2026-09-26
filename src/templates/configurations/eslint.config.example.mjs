import { defineConfig } from 'eslint/config';
import absolute from 'eslint-plugin-absolute';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
	{
		ignores: [
			'node_modules/**',
			'build/**',
			'dist/**',
			'.absolutejs/**',
			'.data/**',
			'**/.absolutejs-hmr-*',
			'drizzle/**'
		]
	},
	{
		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: 'error'
		}
	},
	...tseslint.configs.recommended,
	{
		files: ['**/*.{ts,tsx,js,jsx,mjs}'],
		plugins: { absolute },
		rules: {
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-check': true,
					'ts-expect-error': true,
					'ts-ignore': true,
					'ts-nocheck': true
				}
			],
			'absolute/button-icon-is-hidden': 'error',
			'absolute/elysia-composition-boundaries': 'error',
			'absolute/icon-button-has-accessible-name': 'error',
			'absolute/loading-indicator-has-aria-busy': 'error',
			'absolute/no-chained-type-assertions': 'error',
			'absolute/no-nondeterministic-render': 'error',
			'absolute/no-unsafe-schema-types': 'error',
			'absolute/prefer-drizzle-query-builders': 'error',
			'absolute/progressbar-has-state': 'error'
		}
	},
	{
		files: ['src/backend/**/*.{ts,tsx}'],
		rules: { 'absolute/elysia-no-response-return': 'error' }
	},
	{
		files: ['src/frontend/**/*.{ts,tsx,js,jsx}'],
		rules: {
			'absolute/eden-requires-react-query': 'error',
			'no-restricted-syntax': [
				'error',
				{
					message: 'Use a directly typed Eden subapp client.',
					selector: "CallExpression[callee.name='fetch']"
				},
				{
					message: 'Use a directly typed Eden subapp client.',
					selector: "CallExpression[callee.property.name='fetch']"
				}
			]
		}
	},
	{
		files: ['**/*.{html,vue,svelte,gjs,gts}'],
		plugins: { absolute },
		processor: 'absolute/template-source'
	},
	{
		// React Hooks rules do not apply to Angular's unrelated usePageContext API.
		files: [
			'src/frontend/**/*.{tsx,jsx}',
			'src/frontend/**/hooks/**/*.{ts,js}'
		],
		plugins: { 'react-hooks': reactHooks },
		rules: {
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/rules-of-hooks': 'error'
		}
	}
]);
