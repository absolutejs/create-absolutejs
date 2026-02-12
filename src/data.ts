import { cyan, green, magenta } from 'picocolors';
import type { FrontendLabels, AvailableDependency } from './types';
import { versions } from './versions';

export const availableFrontends = [
	'react',
	'html',
	'svelte',
	// 'angular',
	'vue',
	'htmx'
] as const;
export const availableAuthProviders = ['abs', 'none'] as const;

export const availableDrizzleDialects = [
	'gel',
	'mariadb',
	'mssql',
	'mysql',
	'postgresql',
	'singlestore',
	'sqlite'
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
		latestVersion: versions['@elysiajs/cors'],
		value: '@elysiajs/cors'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'swagger' }],
		label: cyan('📑 @elysiajs/swagger'),
		latestVersion: versions['@elysiajs/swagger'],
		value: '@elysiajs/swagger'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'rateLimit' }],
		label: green('🛠️ elysia-rate-limit'),
		latestVersion: versions['elysia-rate-limit'],
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
	latestVersion: versions['@absolutejs/auth'],
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
	latestVersion: versions['elysia-scoped-state'],
	value: 'elysia-scoped-state'
};

export const eslintAndPrettierDependencies: AvailableDependency[] = [
	{
		latestVersion: versions['eslint'],
		value: 'eslint'
	},
	{
		latestVersion: versions['prettier'],
		value: 'prettier'
	},
	{
		latestVersion: versions['@stylistic/eslint-plugin-ts'],
		value: '@stylistic/eslint-plugin-ts'
	},
	{
		latestVersion: versions['@typescript-eslint/parser'],
		value: '@typescript-eslint/parser'
	},
	{
		latestVersion: versions['eslint-plugin-absolute'],
		value: 'eslint-plugin-absolute'
	},
	{
		latestVersion: versions['eslint-plugin-import'],
		value: 'eslint-plugin-import'
	},
	{
		latestVersion: versions['eslint-plugin-promise'],
		value: 'eslint-plugin-promise'
	},
	{
		latestVersion: versions['eslint-plugin-security'],
		value: 'eslint-plugin-security'
	},
	{
		latestVersion: versions['typescript-eslint'],
		value: 'typescript-eslint'
	}
];

export const eslintReactDependencies: AvailableDependency[] = [
	{
		latestVersion: versions['eslint-plugin-jsx-a11y'],
		value: 'eslint-plugin-jsx-a11y'
	},
	{
		latestVersion: versions['eslint-plugin-react'],
		value: 'eslint-plugin-react'
	},
	{
		latestVersion: versions['eslint-plugin-react-compiler'],
		value: 'eslint-plugin-react-compiler'
	},
	{
		latestVersion: versions['eslint-plugin-react-hooks'],
		value: 'eslint-plugin-react-hooks'
	}
];

export const defaultDependencies: AvailableDependency[] = [
	{
		imports: [{ isPlugin: false, packageName: 'Elysia' }],
		latestVersion: versions['elysia'],
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
		latestVersion: versions['@absolutejs/absolute'],
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
		latestVersion: versions['@elysiajs/static'],
		value: '@elysiajs/static'
	}
];
