import { afterEach, expect, test } from 'bun:test';
import {
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	rmSync,
	readFileSync
} from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import ts from 'typescript';
import { scaffoldConfigurationFiles } from '../src/generators/configurations/scaffoldConfigurationFiles';
const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0))
		rmSync(root, { recursive: true, force: true });
});
for (const frontend of ['react', 'angular'] as const) {
	for (const buildDirectory of ['build', 'custom-output']) {
		test(`${frontend}: generated ${buildDirectory} files and HMR scratch files stay out of project typechecking`, () => {
			const projectName = mkdtempSync(
				join(tmpdir(), 'absolute-generated-')
			);
			roots.push(projectName);
			scaffoldConfigurationFiles({
				projectName,
				buildDirectory,
				templatesDirectory: resolve(
					import.meta.dir,
					'../src/templates'
				),
				frontends: [frontend],
				codeQualityTool: 'eslint+prettier',
				databaseEngine: 'none',
				databaseHost: 'none',
				envVariables: undefined,
				initializeGitNow: false,
				tailwind: undefined
			});
			mkdirSync(join(projectName, buildDirectory), { recursive: true });
			mkdirSync(join(projectName, 'src'));
			writeFileSync(
				join(projectName, buildDirectory, 'generated.ts'),
				'const broken: number = "generated";'
			);
			writeFileSync(
				join(projectName, 'src', '.absolutejs-hmr-test.ts'),
				'const broken: number = "temporary";'
			);
			writeFileSync(
				join(projectName, 'src', 'app.ts'),
				'export const value = 1;'
			);
			const config = ts.readConfigFile(
				join(projectName, 'tsconfig.json'),
				ts.sys.readFile
			);
			if (frontend === 'angular') {
				expect(
					config.config.compilerOptions.experimentalDecorators
				).toBe(true);
				expect(
					config.config.angularCompilerOptions.strictTemplates
				).toBe(true);
			}
			const parsed = ts.parseJsonConfigFileContent(
				config.config,
				ts.sys,
				projectName
			);
			expect(parsed.fileNames).toEqual([
				join(projectName, 'src', 'app.ts')
			]);
			const ignore = readFileSync(
				join(projectName, '.prettierignore'),
				'utf-8'
			);
			expect(ignore).toContain(buildDirectory);
			expect(ignore).toContain('**/.absolutejs-hmr-*');
		});
	}
}
