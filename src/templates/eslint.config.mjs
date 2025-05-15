import pluginJs from '@eslint/js';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from "eslint/config";
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import promise from 'eslint-plugin-promise';
import pluginReact from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import custom from './eslint/custom-rules-plugin.js';
import { overrides } from './eslint/overrides.js';
import { restrictedSyntax } from './eslint/restrictedSyntax.js';

export default defineConfig([
	// Global file patterns and environments
	{ files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
	{ languageOptions: { globals: globals.browser } },
	jsxA11y.flatConfigs.recommended,
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	{
		// TypeScript parser options for TS files
		languageOptions: {
			parser: tsParser,
			parserOptions: { project: './tsconfig.json' }
		}
	},
	{
		plugins: {
			'@stylistic/ts': stylisticTs,
			custom: custom,
			import: importPlugin,
			promise: promise,
			'react-compiler': reactCompiler,
			'react-hooks': pluginReactHooks,
			security: security
		},
		rules: {
			'@stylistic/ts/padding-line-between-statements': [
				'error',
				{
					blankLine: 'always',
					next: 'return',
					prev: '*'
				}
			],
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/no-confusing-void-expression': 'error',
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-duplicate-type-constituents': 'error',
			'@typescript-eslint/no-empty-object-type': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'arrow-body-style': ['error', 'as-needed'],
			'consistent-return': 'error',
			'custom/explicit-object-types': 'error',
			'custom/localize-react-props': 'error',
			'custom/max-depth-extended': ['error', 1],
			'custom/max-jsxnesting': ['error', 5],
			'custom/min-var-length': [
				'error',
				{ allowedVars: ['_', 'id', 'db'], minLength: 3 }
			],
			'custom/no-button-navigation': 'error',
			'custom/no-explicit-return-type': 'error',
			'custom/no-inline-prop-types': 'error',
			'custom/no-multi-style-objects': 'error',
			'custom/no-nested-jsx-return': 'error',
			'custom/no-or-none-component': 'error',
			'custom/no-transition-cssproperties': 'error',
			'custom/no-type-cast': 'error',
			'custom/no-unnecessary-div': 'error',
			'custom/no-unnecessary-key': 'error',
			// 'custom/spring-naming-convention': 'error', // TODO: Chris first task uncomment and fix
			// 'custom/inline-style-limit': ['error', 3], // TODO: Chris first task uncomment and fix
			'custom/no-useless-function': 'error',
			'custom/seperate-style-files': 'error',
			'custom/sort-exports': [
				'error',
				{
					caseSensitive: true,
					natural: true,
					order: 'asc',
					variablesBeforeFunctions: true
				}
			],
			'custom/sort-keys-fixable': [
				'error',
				{
					caseSensitive: true,
					natural: true,
					order: 'asc',
					variablesBeforeFunctions: true
				}
			],
			eqeqeq: 'error',
			'func-style': [
				'error',
				'expression',
				{ allowArrowFunctions: true }
			],
			'import/no-cycle': 'error',
			'import/no-default-export': 'error',
			'import/no-relative-packages': 'error',
			'import/no-unused-modules': [
				'error',
				{
					missingExports: true
				}
			],
			'import/order': ['error', { alphabetize: { order: 'asc' } }],
			'jsx-a11y/prefer-tag-over-role': 'error',
			'no-await-in-loop': 'error',
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'no-duplicate-case': 'error',
			'no-duplicate-imports': 'error',
			'no-else-return': 'error',
			'no-empty-function': 'error',
			'no-empty-pattern': 'error',
			'no-empty-static-block': 'error',
			'no-fallthrough': 'error',
			'no-floating-decimal': 'error',
			'no-global-assign': 'error',
			'no-implicit-coercion': 'error',
			'no-implicit-globals': 'error',
			'no-loop-func': 'error',
			'no-magic-numbers': [
				'warn',
				{ detectObjects: false, enforceConst: true, ignore: [0, 1] }
			],
			'no-misleading-character-class': 'error',
			'no-nested-ternary': 'error',
			'no-new-native-nonconstructor': 'error',
			'no-new-wrappers': 'error',
			'no-param-reassign': 'error',
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							importNames: ['default'],
							message:
								'Importing the entire React object is not allowed. Please import only the required exports for better tree shaking.',
							name: 'react'
						},
						{
							importNames: ['default'],
							message:
								'Importing the entire Bun object is not allowed. Please import only the required exports for better tree shaking.',
							name: 'bun'
						}
					]
				}
			],
			'no-restricted-syntax': ['error', ...restrictedSyntax],
			'no-return-await': 'error',
			'no-shadow': 'error',
			'no-undef': 'error',
			'no-unneeded-ternary': 'error',
			'no-unreachable': 'error',
			'no-useless-assignment': 'error',
			'no-useless-concat': 'error',
			'no-useless-return': 'error',
			'no-var': 'error',
			'prefer-arrow-callback': 'error',
			'prefer-const': 'error',
			'prefer-destructuring': [
				'error',
				{ array: true, object: true },
				{ enforceForRenamedProperties: false }
			],
			'prefer-template': 'error',
			'promise/always-return': 'warn',
			'promise/avoid-new': 'warn',
			'promise/catch-or-return': 'error',
			'promise/no-callback-in-promise': 'warn',
			'promise/no-nesting': 'warn',
			'promise/no-promise-in-callback': 'warn',
			'promise/no-return-wrap': 'error',
			'promise/param-names': 'error',
			'react-compiler/react-compiler': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'react-hooks/rules-of-hooks': 'error',
			'react/checked-requires-onchange-or-readonly': 'error',
			'react/destructuring-assignment': ['error', 'always'],
			'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
			'react/jsx-no-leaked-render': 'error',
			'react/jsx-no-target-blank': 'error',
			'react/jsx-no-useless-fragment': 'error',
			'react/jsx-pascal-case': ['error', { allowAllCaps: true }],
			'react/no-multi-comp': 'error',
			'react/no-unknown-property': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/self-closing-comp': 'error'
		},
		settings: {
			react: {
				version: 'detect'
			}
		}
	},
	...overrides
]);