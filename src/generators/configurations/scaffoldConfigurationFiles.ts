import { copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { CreateConfiguration } from '../../types';
import { generateEnv } from './generateEnv';
import { generatePrettierrc } from './generatePrettierrc';
import { generateBiomeConfig } from './generateBiomeConfig';

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
		copyFileSync(
			join(templatesDirectory, 'configurations', 'eslint.config.mjs'),
			join(projectName, 'eslint.config.mjs')
		);
		copyFileSync(
			join(templatesDirectory, 'configurations', '.prettierignore'),
			join(projectName, '.prettierignore')
		);
		const prettierrc = generatePrettierrc(frontends);
		writeFileSync(join(projectName, '.prettierrc.json'), prettierrc);
	} else if (codeQualityTool === 'biome') {
		// Generate biome.json dynamically based on selected frontends
		const biomeJson = generateBiomeConfig({ frontends });
		writeFileSync(join(projectName, 'biome.json'), biomeJson, 'utf8');

		// Optional: copy a shared .biomeignore template if you keep one in templates
		copyFileSync(
			join(templatesDirectory, 'configurations', '.biomeignore'),
			join(projectName, '.biomeignore')
		);
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
