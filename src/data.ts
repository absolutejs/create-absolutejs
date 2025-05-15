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
		label: cyan('📦 @elysia-static'),
		latestVersion: getPackageVersion('@elysia-static') ?? '0.0.0',
		value: '@elysia-static'
	},
	{
		import: 'cors',
		label: cyan('⚙️ @elysia-cors'),
		latestVersion: getPackageVersion('@elysia-cors') ?? '0.0.0',
		value: '@elysia-cors'
	},
	{
		import: 'swagger',
		label: cyan('📑 @elysiajs/swagger'),
		latestVersion: getPackageVersion('@elysiajs/swagger') ?? '0.0.0',
		value: '@elysiajs/swagger'
	},
	{
		import: 'rateLimit',
		label: green('🛠️ elysia-rate-limit'),
		latestVersion: getPackageVersion('elysia-rate-limit') ?? '0.0.0',
		value: 'elysia-rate-limit'
	}
];

export const defaultPlugins: AvailablePlugin[] = [
	{
		import: 'Elysia',
		latestVersion: getPackageVersion('elysia') ?? '1.3.0',
		value: 'elysia'
	}
];
