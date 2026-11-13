import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { expect, test } from 'bun:test';
import { generateServerFile } from '../src/generators/project/generateServer';

test('generated server uses the Elysia 2 error lifecycle', () => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-server-'));
	const backendDirectory = join(project, 'src', 'backend');
	mkdirSync(backendDirectory, { recursive: true });
	try {
		generateServerFile({
			assetsDirectory: 'assets',
			authOption: undefined,
			backendDirectory,
			buildDirectory: 'build',
			databaseEngine: undefined,
			databaseHost: undefined,
			frontendDirectories: { react: 'react' },
			orm: undefined,
			plugins: [],
			publicDirectory: 'public',
			tailwind: undefined
		});
		const source = readFileSync(
			join(backendDirectory, 'server.ts'),
			'utf8'
		);
		expect(source).toContain('.onError(({ request, error }) => {');
		expect(source).not.toContain('.error((');
		expect(source).not.toContain(".on('error'");
		expect(source).not.toContain('err.message');
		expect(source).not.toContain('export type Server');
		expect(source).toContain('.use([absolutejs, api])');
		expect(
			readFileSync(join(backendDirectory, 'api.ts'), 'utf8')
		).toContain('export type Api = typeof api');
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
});

test('the rate limiter is @absolutejs/rate-limit, in the plugin array, keyed on the edge’s client address', () => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-server-'));
	const backendDirectory = join(project, 'src', 'backend');
	mkdirSync(backendDirectory, { recursive: true });
	try {
		generateServerFile({
			assetsDirectory: 'assets',
			authOption: undefined,
			backendDirectory,
			buildDirectory: 'build',
			databaseEngine: undefined,
			databaseHost: undefined,
			frontendDirectories: { react: 'react' },
			orm: undefined,
			plugins: ['@absolutejs/rate-limit', '@elysia/cors'],
			publicDirectory: 'public',
			tailwind: undefined
		});
		const source = readFileSync(
			join(backendDirectory, 'server.ts'),
			'utf8'
		);
		expect(source).toContain(
			"import { gcra, rateLimit } from '@absolutejs/rate-limit'"
		);
		expect(source).not.toContain('elysia-rate-limit');
		// One shallow array, as the project's own lint rule wants; called plugins stay in it.
		expect(source).toMatch(
			/\.use\(\[absolutejs, api, [^\]]*rateLimiter[^\]]*\]\)/
		);
		expect(source).toContain('cors()');
		expect(source).not.toMatch(/\.use\((cors|rateLimit)\(/);
		expect(source).toContain("clientIpHeader: 'x-real-ip'");
		expect(source).toContain("trustedProxyCidrs: ['10.0.0.0/8']");
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
});
