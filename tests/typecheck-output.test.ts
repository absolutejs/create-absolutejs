import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import ts from 'typescript';
import { scaffoldConfigurationFiles } from '../src/generators/configurations/scaffoldConfigurationFiles';

for (const frontend of ['react', 'angular'] as const) {
	for (const buildDirectory of ['build', 'custom-output']) {
		test(`${frontend} typecheck excludes ${buildDirectory} artifacts but retains application sources`, async () => {
			const dir = await mkdtemp(join(tmpdir(), 'absolute-typecheck-'));
			try {
				scaffoldConfigurationFiles({
					buildDirectory,
					codeQualityTool: 'eslint+prettier',
					databaseEngine: 'none',
					databaseHost: 'none',
					envVariables: undefined,
					frontends: [frontend],
					initializeGitNow: false,
					projectName: dir,
					tailwind: undefined,
					templatesDirectory: join(
						import.meta.dir,
						'../src/templates'
					)
				});
				for (const folder of [
					'src',
					buildDirectory,
					'.absolutejs',
					'dist'
				]) {
					await mkdir(join(dir, folder), { recursive: true });
					await writeFile(
						join(dir, folder, 'entry.ts'),
						'export const value: string = 123;'
					);
				}
				const read = ts.readConfigFile(
					join(dir, 'tsconfig.json'),
					ts.sys.readFile
				);
				expect(read.error).toBeUndefined();
				const parsed = ts.parseJsonConfigFileContent(
					read.config,
					ts.sys,
					dir
				);
				expect(parsed.errors).toEqual([]);
				expect(parsed.fileNames).toEqual([join(dir, 'src/entry.ts')]);
				const program = ts.createProgram(parsed.fileNames, {
					...parsed.options,
					noEmit: true,
					types: []
				});
				expect(
					program
						.getSemanticDiagnostics()
						.some((diagnostic) => diagnostic.code === 2322)
				).toBe(true);
				if (frontend === 'angular') {
					expect(parsed.options.experimentalDecorators).toBe(true);
					expect(
						read.config.angularCompilerOptions.strictTemplates
					).toBe(true);
				}
			} finally {
				await rm(dir, { force: true, recursive: true });
			}
		});
	}
}

test('svelte tsconfig resolves server imports to generated component declarations', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'absolute-typecheck-'));
	try {
		scaffoldConfigurationFiles({
			buildDirectory: 'build',
			codeQualityTool: 'eslint+prettier',
			databaseEngine: 'none',
			databaseHost: 'none',
			envVariables: undefined,
			frontends: ['svelte'],
			initializeGitNow: false,
			projectName: dir,
			tailwind: undefined,
			templatesDirectory: join(import.meta.dir, '../src/templates')
		});
		const read = ts.readConfigFile(
			join(dir, 'tsconfig.json'),
			ts.sys.readFile
		);
		const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dir);
		expect(parsed.options.rootDirs).toEqual([
			dir,
			join(dir, '.absolutejs/types/svelte')
		]);
	} finally {
		await rm(dir, { force: true, recursive: true });
	}
});
