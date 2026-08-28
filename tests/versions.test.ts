import { describe, expect, test } from 'bun:test';
import {
	availablePlugins,
	defaultDependencies,
	defaultPlugins
} from '../src/data';
import { versions } from '../src/versions';
import { generateImportsBlock } from '../src/generators/project/generateImportsBlock';

describe('generated runtime versions', () => {
	test('scaffolds the coordinated pre-1.0 AbsoluteJS release', () => {
		expect(versions['@absolutejs/absolute']).toBe('0.20.0-beta.0');
		expect(versions['@absolutejs/manifest']).toBe('0.9.0');
		expect(versions['@absolutejs/mcp']).toBe('0.12.0');
		expect(versions['@absolutejs/scoped-state']).toBe('0.2.0');
	});

	test('uses only Elysia 2 package names and tested beta versions', () => {
		expect(versions.elysia).toBe('2.0.0-beta.6');
		expect(versions['@elysia/cors']).toBe('2.0.0-beta.1');
		expect(versions['@absolutejs/observability']).toBe('0.6.0');
		expect(versions['@elysia/eden']).toBe('2.0.0-beta.5');
		expect(versions['@elysia/openapi']).toBe('2.0.0-beta.1');
		expect(versions['@elysia/static']).toBe('2.0.0-beta.2');

		const generatedPackages = [
			...availablePlugins,
			...defaultDependencies,
			...defaultPlugins
		].map(({ value }) => value);
		expect(
			generatedPackages.some((name) => name.startsWith('@elysiajs/'))
		).toBe(false);
	});

	test('offers the managed observability and Support Mode relay', () => {
		const observability = availablePlugins.find(
			(plugin) => plugin.value === '@absolutejs/observability'
		);
		expect(observability?.latestVersion).toBe('0.6.0');
		expect(observability?.imports).toEqual([
			{
				config: null,
				importFrom: '@absolutejs/observability/elysia',
				isPlugin: true,
				packageName: 'createManagedObservabilityRelayFromEnv'
			}
		]);
		const imports = generateImportsBlock({
			authOption: 'none',
			databaseEngine: 'none',
			databaseHost: 'none',
			deps: observability === undefined ? [] : [observability],
			flags: {
				requiresAngular: false,
				requiresHtml: false,
				requiresHtmx: false,
				requiresReact: false,
				requiresSvelte: false,
				requiresVue: false
			},
			frontendDirectories: {},
			orm: 'none'
		});
		expect(imports).toContain("from '@absolutejs/observability/elysia'");
	});
});
