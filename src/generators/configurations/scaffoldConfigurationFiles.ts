import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { CreateConfiguration } from '../../types';
import { generateEnv } from './generateEnv';
import { generateEslintConfig } from './generateEslintConfig';
import { generatePrettierrc } from './generatePrettierrc';

type AddConfigurationProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'initializeGitNow'
	| 'codeQualityTool'
	| 'frontends'
	| 'projectName'
	| 'databaseEngine'
	| 'databaseHost'
> & {
	templatesDirectory: string;
	buildDirectory?: string;
	envVariables: string[] | undefined;
};

export const scaffoldConfigurationFiles = ({
	tailwind,
	buildDirectory = 'build',
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

	const raw = readFileSync(
		join(templatesDirectory, 'configurations', 'tsconfig.example.json'),
		'utf-8'
	);
	const stripped = raw
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/[^\n]*/g, '')
		.replace(/,\s*([}\]])/g, '$1');
	const tsconfig = JSON.parse(stripped) as {
		compilerOptions: Record<string, unknown>;
		exclude?: string[];
		angularCompilerOptions?: Record<string, unknown>;
	};
	tsconfig.exclude = [
		'node_modules',
		buildDirectory,
		'dist',
		'.absolutejs',
		'**/.absolutejs-hmr-*'
	];
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
