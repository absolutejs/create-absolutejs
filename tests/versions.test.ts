import { describe, expect, test } from 'bun:test';
import {
	availablePlugins,
	defaultDependencies,
	defaultPlugins
} from '../src/data';
import { versions } from '../src/versions';

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
});
