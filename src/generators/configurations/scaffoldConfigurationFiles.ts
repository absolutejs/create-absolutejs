import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { CreateConfiguration } from '../../types';
import { generateEnv } from './generateEnv';
import { generateEslintConfig } from './generateEslintConfig';
import { generatePrettierrc } from './generatePrettierrc';

type AddConfigurationProps = Pick<
	CreateConfiguration,
	| 'buildDirectory'
	| 'tailwind'
	| 'initializeGitNow'
	| 'codeQualityTool'
	| 'frontends'
	| 'projectName'
	| 'databaseEngine'
	| 'databaseHost'
> & {
	templatesDirectory: string;
	envVariables: string[] | undefined;
};

export const scaffoldConfigurationFiles = ({
	buildDirectory,
	tailwind,
	templatesDirectory,
	databaseEngine,
	envVariables,
	databaseHost,
	codeQualityTool,
	frontends,
	initializeGitNow,
	projectName
}: AddConfigurationProps) => {
	const hasAngular = frontends.includes('angular');

	const templatePath = join(
		templatesDirectory,
		'configurations',
		'tsconfig.example.json'
	);
	const raw = readFileSync(templatePath, 'utf-8');
	const stripped = raw
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/[^\n]*/g, '')
		.replace(/,\s*([}\]])/g, '$1');
	const tsconfig = JSON.parse(stripped) as {
		compilerOptions: Record<string, unknown>;
		exclude?: string[];
		include?: string[];
		angularCompilerOptions?: Record<string, unknown>;
	};
	// Dev entrypoints contain browser-only module URLs and are not application sources.
	// Respect the chosen output directory instead of assuming the default "build".
	tsconfig.exclude = [
		...new Set([
			...(tsconfig.exclude ?? []),
			'node_modules',
			buildDirectory,
			'dist',
			// The dev server's transient copies of server files.
			'**/.absolutejs-hmr-*'
		])
	];
	/* `absolute dev`, `build` and `typecheck` write the project's manifest keys
	   to .absolutejs/types/manifest.d.ts, which narrows `asset(manifest, key)`;
	   listing it gives editors the same check. `**` already skips dot-folders,
	   so the rest of .absolutejs stays out; excluding .absolutejs would also
	   drop this file, and a missing file (before the first command) is fine. */
	tsconfig.include = ['**/*', '.absolutejs/types/manifest.d.ts'];
	/* `absolute typecheck` and `absolute dev` write a declaration per Svelte
	   component under .absolutejs/types/svelte; listing that mirror in
	   rootDirs lets tsc and editors check Svelte page props in server files. */
	if (frontends.includes('svelte')) {
		tsconfig.compilerOptions['rootDirs'] = [
			'.',
			'.absolutejs/types/svelte'
		];
	}
	if (hasAngular) {
		tsconfig.compilerOptions['emitDecoratorMetadata'] = true;
		tsconfig.compilerOptions['experimentalDecorators'] = true;
		tsconfig.compilerOptions['useDefineForClassFields'] = false;
		tsconfig.angularCompilerOptions = {
			enableI18nLegacyMessageIdFormat: false,
			strictInjectionParameters: true,
			strictTemplates: true
		};
	}
	writeFileSync(
		join(projectName, 'tsconfig.json'),
		JSON.stringify(tsconfig, null, '\t')
	);

	if (tailwind) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'postcss.config.ts'),
			join(projectName, 'postcss.config.ts')
		);
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.config.ts'),
			join(projectName, 'tailwind.config.ts')
		);
	}
	if (initializeGitNow)
		copyFileSync(
			join(templatesDirectory, 'git', 'gitignore'),
			join(projectName, '.gitignore')
		);

	if (codeQualityTool === 'eslint+prettier') {
		writeFileSync(
			join(projectName, 'eslint.config.mjs'),
			generateEslintConfig(frontends)
		);
		writeFileSync(
			join(projectName, '.prettierignore'),
			`${readFileSync(join(templatesDirectory, 'configurations', '.prettierignore'), 'utf-8')}\n${buildDirectory}\n.absolutejs\n**/.absolutejs-hmr-*\n`
		);
		const prettierrc = generatePrettierrc(frontends);

		writeFileSync(join(projectName, '.prettierrc.json'), prettierrc);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);

	generateEnv({
		databaseEngine,
		databaseHost,
		envVariables,
		projectName
	});
};
