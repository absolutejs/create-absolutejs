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
	envVariables: string[] | undefined;
};

export const scaffoldConfigurationFiles = ({
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

	if (hasAngular) {
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
		};

		tsconfig.compilerOptions['emitDecoratorMetadata'] = true;
		tsconfig.compilerOptions['experimentalDecorators'] = true;
		tsconfig.compilerOptions['useDefineForClassFields'] = false;

		const withAngular: Record<string, unknown> = {
			angularCompilerOptions: {
				enableI18nLegacyMessageIdFormat: false,
				strictInjectionParameters: true,
				strictTemplates: true
			},
			...tsconfig
		};

		writeFileSync(
			join(projectName, 'tsconfig.json'),
			JSON.stringify(withAngular, null, '\t')
		);
	} else {
		copyFileSync(
			join(templatesDirectory, 'configurations', 'tsconfig.example.json'),
			join(projectName, 'tsconfig.json')
		);
	}

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
		copyFileSync(
			join(templatesDirectory, 'configurations', '.prettierignore'),
			join(projectName, '.prettierignore')
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
