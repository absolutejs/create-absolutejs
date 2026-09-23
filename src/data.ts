import { cyan, green, magenta, red } from 'picocolors';
import type { FrontendLabels, AvailableDependency } from './types';
import { versions } from './versions';

export const absoluteAuthPlugin: AvailableDependency = {
	imports: [
		{
			config: {
				providersConfiguration: {}
			},
			isPlugin: true,
			packageName: 'auth'
		}
	],
	latestVersion: versions['@absolutejs/auth'],
	value: '@absolutejs/auth'
};
export const availableAuthProviders = ['abs', 'none'] as const;
export const availableCodeQualityTools = ['eslint+prettier', 'biome'] as const;
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
export const availableDatabaseHosts = [
	'neon',
	'planetscale',
	'turso',
	'none'
] as const;
export const availableDirectoryConfigurations = ['default', 'custom'] as const;
export const availableDrizzleDialects = [
	'mariadb',
	'mssql',
	'mysql',
	'postgresql',
	'singlestore',
	'sqlite'
] as const;
export const availableFrontends = [
	'react',
	'html',
	'svelte',
	'vue',
	'htmx',
	'angular'
] as const;
export const availableORMs = ['drizzle', 'prisma', 'none'] as const;
export const availablePlugins: AvailableDependency[] = [
	{
		imports: [
			{
				config: null,
				importFrom: '@absolutejs/observability/elysia',
				isPlugin: true,
				packageName: 'createManagedObservabilityRelayFromEnv'
			}
		],
		label: magenta('🔎 @absolutejs/observability + Support Mode'),
		latestVersion: versions['@absolutejs/observability'],
		value: '@absolutejs/observability'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'cors' }],
		label: cyan('⚙️ @elysia/cors'),
		latestVersion: versions['@elysia/cors'],
		value: '@elysia/cors'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'openapi' }],
		label: cyan('📑 @elysia/openapi'),
		latestVersion: versions['@elysia/openapi'],
		value: '@elysia/openapi'
	},
	{
		imports: [{ config: null, isPlugin: true, packageName: 'rateLimit' }],
		label: green('🛠️ elysia-rate-limit'),
		latestVersion: versions['elysia-rate-limit'],
		value: 'elysia-rate-limit'
	}
];
export const availablePrismaDialects = [
	'mysql',
	'postgresql',
	'sqlite',
	'mongodb',
	'mariadb',
	'cockroachdb',
	'mssql'
] as const;
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
			{ isPlugin: true, packageName: 'networking' },
			{ isPlugin: false, packageName: 'prepare' }
		],
		latestVersion: versions['@absolutejs/absolute'],
		value: '@absolutejs/absolute'
	},
	{
		latestVersion: versions['@elysia/eden'],
		value: '@elysia/eden'
	},
	{
		latestVersion: versions['@elysia/static'],
		value: '@elysia/static'
	}
];
export const eslintAndPrettierDependencies: AvailableDependency[] = [
	{
		latestVersion: versions['@eslint/compat'],
		value: '@eslint/compat'
	},
	{
		latestVersion: versions['@eslint/js'],
		value: '@eslint/js'
	},
	{
		latestVersion: versions['eslint'],
		value: 'eslint'
	},
	{
		latestVersion: versions['globals'],
		value: 'globals'
	},
	{
		latestVersion: versions['prettier'],
		value: 'prettier'
	},
	{
		latestVersion: versions['@stylistic/eslint-plugin'],
		value: '@stylistic/eslint-plugin'
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
	},
	{
		latestVersion: versions['zod-validation-error'],
		value: 'zod-validation-error'
	}
];
export const frontendLabels: FrontendLabels = {
	angular: red('Angular'),
	html: 'HTML',
	htmx: 'HTMX',
	react: cyan('React'),
	svelte: magenta('Svelte'),
	vue: green('Vue')
};
export const scopedStatePlugin: AvailableDependency = {
	imports: [
		{
			config: { count: { value: 0 } },
			isPlugin: true,
			packageName: 'scopedState'
		}
	],
	latestVersion: versions['@absolutejs/scoped-state'],
	value: '@absolutejs/scoped-state'
};
