// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import pluginJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
	{
		ignores: ['dist/**', 'build/**', 'node_modules/**']
	},

	pluginJs.configs.recommended,

	...tseslint.configs.recommended,

	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			globals: globals.browser,
			parser: tsParser,
			parserOptions: {
				createDefaultProgram: true,
				project: './tsconfig.json',
				tsconfigRootDir: __dirname
			}
		}
	},

	{
		files: ['**/*.{js,mjs,cjs,ts,tsx,jsx,json}'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			],
			'no-console': 'warn',
			'prefer-const': 'error'
		}
	}
]);

