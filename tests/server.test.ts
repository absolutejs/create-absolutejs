import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { expect, test } from 'bun:test';
import { generateServerFile } from '../src/generators/project/generateServer';

test('generated server leaves errors to AbsoluteJS, with no onError of its own', () => {
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
		// An app onError would stop AbsoluteJS rendering error.html.
		expect(source).not.toContain('onError');
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

test('an OAuth provider turns on only when its settings are present, so a new project starts without them', async () => {
	const { generateAbsoluteAuthConfig } =
		await import('../src/generators/project/generateAbsoluteAuthConfig');
	const source = generateAbsoluteAuthConfig(['google'], true);
	expect(source).toContain(
		'...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.OAUTH2_CALLBACK_URI'
	);
	expect(source).toContain("clientId: getEnv('GOOGLE_CLIENT_ID')");
	expect(source).toContain(': {})');
});

test('HTMX scoped state is a top-level const, so backend HMR keeps visitors’ state', () => {
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
			frontendDirectories: { htmx: 'htmx' },
			orm: undefined,
			plugins: [],
			publicDirectory: 'public',
			tailwind: undefined
		});
		const source = readFileSync(
			join(backendDirectory, 'server.ts'),
			'utf8'
		);
		expect(source).toContain(
			'const visitorState = scopedState({ count: { value: 0 } })'
		);
		expect(source).toContain('.use([absolutejs, api, visitorState])');
		expect(source).not.toMatch(/\.use\(\[[^\]]*scopedState\(/);
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
});
