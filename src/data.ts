import { cyan, green, magenta } from 'picocolors';
import type { FrontendLabels, AvailableDependency } from './types';

export const availableFrontends = [
	'react',
	'html',
	'svelte',
	// 'angular',
	// 'vue',
	'htmx'
] as const;
export const availableAuthProviders = ['absoluteAuth', 'none'] as const;
export const availableDatabaseEngines = [
	'postgresql',
	'mysql',
	'sqlite',
	'mongodb',
	'redis',
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
	'supabase',
	'turso',
	'vercel',
	'upstash',
	'atlas',
	'none'
] as const;
export const availableCodeQualityTools = ['eslint+prettier', 'biome'] as const;

/* eslint-disable absolute/sort-keys-fixable */
export const frontendLabels: FrontendLabels = {
	react: cyan('React'),
	html: 'HTML',
	svelte: magenta('Svelte'),
	// angular: red('Angular'),
	// vue: green('Vue'),
	htmx: 'HTMX'
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
			config: { providersConfiguration: {} },
			isPlugin: true,
			packageName: 'absoluteAuth'
		}
	],
	latestVersion: '0.3.2',
	value: '@absolutejs/auth'
};

export const eslintAndPrettierDependencies: AvailableDependency[] = [
	{
		latestVersion: '9.27.0',
		value: 'eslint'
	},
	{
		latestVersion: '3.5.3',
		value: 'prettier'
	}
];

export const defaultDependencies: AvailableDependency[] = [
	{
		imports: [{ isPlugin: false, packageName: 'Elysia' }],
		latestVersion: '1.3.1',
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
		latestVersion: '0.10.3',
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
		latestVersion: '1.3.0',
		value: '@elysiajs/static'
	}
];
