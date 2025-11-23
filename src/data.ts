import { cyan, green, magenta } from 'picocolors';
import type { FrontendLabels, AvailableDependency } from './types';

export const availableFrontends = [
	'react',
	'html',
	'svelte',
	// 'angular',
	'vue',
	'htmx'
] as const;
export const availableAuthProviders = ['absoluteAuth', 'none'] as const;

export const availableDrizzleDialects = [
	'gel',
	'mysql',
	'postgresql',
	'sqlite',
	'singlestore',
	'mariadb'
] as const;

export const availablePrismaDialects = [
	'mysql',
	'postgresql',
	'sqlite',
	'mongodb',
	'mariadb',
	'cockroachdb',
	'mssql'
] as const;

export const availableDatabaseEngines = [
	'postgresql',
	'mysql',
	'sqlite',
	'mongodb',
	'mariadb',
	'gel',
	'singlestore',
	'cockroachdb',
	'mssql',
	'none'
] as const;
export const availableDirectoryConfigurations = ['default', 'custom'] as const;
export const availableORMs = ['drizzle', 'prisma', 'none'] as const;
export const availableDatabaseHosts = [
	'neon',
	'planetscale',
	'turso',
	'none'
] as const;
export const availableCodeQualityTools = ['eslint+prettier', 'biome'] as const;

/* eslint-disable absolute/sort-keys-fixable */
export const frontendLabels: FrontendLabels = {
	react: cyan('React'),
	html: 'HTML',
	htmx: 'HTMX',
	svelte: magenta('Svelte'),
	vue: green('Vue')
	// angular: red('Angular'),
};
/* eslint-enable absolute/sort-keys-fixable */

export const availablePlugins: AvailableDependency[] = [
	{
		imports: [{ config: null, isPlugin: true, packageName: 'cors' }],
		label: cyan('⚙️ @elysiajs/cors'),
		latestVersion: '1.3.3',
		value: '@elysiajs/cors'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'swagger' }],
		label: cyan('📑 @elysiajs/swagger'),
		latestVersion: '1.3.0',
		value: '@elysiajs/swagger'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'rateLimit' }],
		label: green('🛠️ elysia-rate-limit'),
		latestVersion: '4.3.0',
		value: 'elysia-rate-limit'
	}
];

export const absoluteAuthPlugin: AvailableDependency = {
	imports: [
		{
			config: {
				providersConfiguration: {}
			},
			isPlugin: true,
			packageName: 'absoluteAuth'
		}
	],
	latestVersion: '0.20.3',
	value: '@absolutejs/auth'
};

export const scopedStatePlugin: AvailableDependency = {
	imports: [
		{
			config: { count: { value: 0 } },
			isPlugin: true,
			packageName: 'scopedState'
		}
	],
	latestVersion: '0.1.1',
	value: 'elysia-scoped-state'
};

export const eslintAndPrettierDependencies: AvailableDependency[] = [
	{
		latestVersion: '9.27.0',
		value: 'eslint'
	},
	{
		latestVersion: '3.5.3',
		value: 'prettier'
	},
	{
		latestVersion: '4.2.0',
		value: '@stylistic/eslint-plugin-ts'
	},
	{
		latestVersion: '8.47.0',
		value: '@typescript-eslint/parser'
	},
	{
		latestVersion: '0.1.6',
		value: 'eslint-plugin-absolute'
	},
	{
		latestVersion: '2.32.0',
		value: 'eslint-plugin-import'
	},
	{
		latestVersion: '6.10.2',
		value: 'eslint-plugin-jsx-a11y'
	},
	{
		latestVersion: '7.2.1',
		value: 'eslint-plugin-promise'
	},
	{
		latestVersion: '7.37.5',
		value: 'eslint-plugin-react'
	},
	{
		latestVersion: '19.1.0-rc.2',
		value: 'eslint-plugin-react-compiler'
	},
	{
		latestVersion: '7.0.0',
		value: 'eslint-plugin-react-hooks'
	},
	{
		latestVersion: '3.0.1',
		value: 'eslint-plugin-security'
	},
	{
		latestVersion: '8.47.0',
		value: 'typescript-eslint'
	}
];

export const defaultDependencies: AvailableDependency[] = [
	{
		imports: [{ isPlugin: false, packageName: 'Elysia' }],
		latestVersion: '1.4.9',
		value: 'elysia'
	}
];

export const defaultPlugins: AvailableDependency[] = [
	{
		imports: [
			{ isPlugin: false, packageName: 'asset' },
			{ isPlugin: false, packageName: 'build' },
			{ isPlugin: true, packageName: 'networking' }
		],
		latestVersion: '0.12.3',
		value: '@absolutejs/absolute'
	},
	{
		imports: [
			{
				config: { assets: './build', prefix: '' },
				isPlugin: true,
				packageName: 'staticPlugin'
			}
		],
		latestVersion: '1.4.0',
		value: '@elysiajs/static'
	}
];
