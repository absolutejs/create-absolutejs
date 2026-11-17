import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import ts from 'typescript';
import { scaffoldConfigurationFiles } from '../src/generators/configurations/scaffoldConfigurationFiles';

for (const frontend of ['react', 'vue', 'svelte', 'angular', 'html', 'htmx'] as const) {
	test(`${frontend} starter catches unsafe access to a missing route parameter`, async () => {
		const dir = await mkdtemp(join(tmpdir(), 'absolute-indexed-access-'));
		try {
			scaffoldConfigurationFiles({
				buildDirectory: 'build',
				codeQualityTool: 'eslint+prettier',
				databaseEngine: 'none',
				databaseHost: 'none',
				envVariables: undefined,
				frontends: [frontend],
				initializeGitNow: false,
				projectName: dir,
				tailwind: undefined,
				templatesDirectory: join(import.meta.dir, '../src/templates')
			});
			const file = join(dir, 'route.ts');
			await writeFile(file, `
export {};
declare const params: Record<string, string | string[]>;
const raw = params.matchId;
const unsafe = typeof raw === 'string' ? raw : raw[0];
const safe = typeof raw === 'string' ? raw : raw?.[0];
`);
			const read = ts.readConfigFile(join(dir, 'tsconfig.json'), ts.sys.readFile);
			const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dir);
			expect(parsed.options.noUncheckedIndexedAccess).toBe(true);
			const program = ts.createProgram([file], { ...parsed.options, noEmit: true, types: [] });
			const diagnostics = program.getSemanticDiagnostics().filter((d) => d.file?.fileName === file);
			expect(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).toEqual(["'raw' is possibly 'undefined'."]);
		} finally {
			await rm(dir, { force: true, recursive: true });
		}
	});
}
