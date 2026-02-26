import { copyFileSync, writeFileSync } from 'fs';
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
	copyFileSync(
		join(templatesDirectory, 'configurations', 'tsconfig.example.json'),
		join(projectName, 'tsconfig.json')
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
		copyFileSync(
			join(templatesDirectory, 'configurations', '.prettierignore'),
			join(projectName, '.prettierignore')
		);
		const prettierrc = generatePrettierrc(frontends);

		writeFileSync(join(projectName, '.prettierrc.json'), prettierrc);
	} else if (codeQualityTool === 'biome') {
		copyFileSync(
			join(templatesDirectory, 'configurations', 'biome.json'),
			join(projectName, 'biome.json')
		);
		copyFileSync(
			join(templatesDirectory, 'configurations', '.biomeignore'),
			join(projectName, '.biomeignore')
		);
	} else {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  No code-quality tool selected or unsupported tool`
		);
	}

	generateEnv({
		databaseEngine,
		databaseHost,
		envVariables,
		projectName
	});
};
