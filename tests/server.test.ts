import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateServerFile } from '../src/generators/project/generateServer';

test('generated server uses the Elysia 2 error lifecycle', () => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-server-'));
	const backendDirectory = join(project, 'src', 'backend');
	mkdirSync(backendDirectory, { recursive: true });
	try {
		generateServerFile({
			backendDirectory,
			assetsDirectory: 'assets',
			publicDirectory: 'public',
			buildDirectory: 'build',
			frontendDirectories: { react: 'react' },
			plugins: [],
			tailwind: undefined,
			authOption: undefined,
			databaseEngine: undefined,
			databaseHost: undefined,
			orm: undefined
		});
		const source = readFileSync(
			join(backendDirectory, 'server.ts'),
			'utf8'
		);
		expect(source).toContain('.error(({ request, error }) => {');
		expect(source).not.toContain(".on('error'");
		expect(source).not.toContain('err.message');
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});
