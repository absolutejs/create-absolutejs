import { cyan, red, green, magenta, blueBright } from 'picocolors';
import type { FrontendFramework, AvailableDependency } from './types';

/* eslint-disable absolute/sort-keys-fixable */
export const availableFrontends: Record<string, FrontendFramework> = {
	react: { label: cyan('React'), name: 'React' },
	html: { label: 'HTML', name: 'HTML' },
	angular: { label: red('Angular'), name: 'Angular' },
	vue: { label: green('Vue'), name: 'Vue' },
	svelte: { label: magenta('Svelte'), name: 'Svelte' },
	htmx: { label: 'HTMX', name: 'HTMX' },
	solid: { label: blueBright('Solid'), name: 'Solid' }
};
/* eslint-enable absolute/sort-keys-fixable */

export const availablePlugins: AvailableDependency[] = [
	{
		imports: [
			{ config: null, isPlugin: true, packageName: 'staticPlugin' }
		],
		label: cyan('📦 @elysiajs/static'),
		latestVersion: '1.3.0',
		value: '@elysiajs/static'
	},
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

export const defaultDependencies: AvailableDependency[] = [
	{
		imports: [{ isPlugin: false, packageName: 'Elysia' }],
		latestVersion: '1.3.0',
		value: 'elysia'
	}
];

export const defaultPlugins: AvailableDependency[] = [
	{
		imports: [
			{ isPlugin: false, packageName: 'build' },
			{ isPlugin: true, packageName: 'networkingPlugin' }
		],
		latestVersion: '0.3.2',
		value: '@absolutejs/absolute'
	}
];
