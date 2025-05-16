import { cyan, red, green, magenta, blueBright } from 'picocolors';
import type { FrontendFramework, AvailablePlugin } from './types';
import { getPackageVersion } from './utils/getPackageVersion';

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

export const availablePlugins: AvailablePlugin[] = [
	{
		import: 'staticPlugin',
		label: cyan('📦 @elysiajs/static'),
		latestVersion: '1.3.0',
		value: '@elysiajs/static'
	},
	{
		import: 'cors',
		label: cyan('⚙️ @elysiajs/cors'),
		latestVersion: '1.3.3',
		value: '@elysiajs/cors'
	},
	{
		import: 'swagger',
		label: cyan('📑 @elysiajs/swagger'),
		latestVersion: '1.3.0',
		value: '@elysiajs/swagger'
	},
	{
		import: 'rateLimit',
		label: green('🛠️ elysia-rate-limit'),
		latestVersion: '4.3.0',
		value: 'elysia-rate-limit'
	}
];

export const defaultPlugins: AvailablePlugin[] = [
	{
		import: 'Elysia',
		latestVersion: '1.3.0',
		value: 'elysia'
	}
];
