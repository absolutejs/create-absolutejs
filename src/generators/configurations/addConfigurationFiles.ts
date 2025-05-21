import { copyFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { PromptResponse } from '../../types';

type AddConfigurationProps = Pick<
	PromptResponse,
	'tailwind' | 'language' | 'initializeGitNow' | 'codeQualityTool'
> & {
	templatesDirectory: string;
	projectName: string;
};

export const addConfigurationFiles = ({
	tailwind,
	templatesDirectory,
	language,
	codeQualityTool,
	initializeGitNow,
	projectName
}: AddConfigurationProps) => {
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
			join(templatesDirectory, 'git', '.gitignore'),
			join(projectName, '.gitignore')
		);
	if (language === 'ts')
		copyFileSync(
			join(templatesDirectory, 'configurations', 'tsconfig.example.json'),
			join(projectName, 'tsconfig.json')
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
		copyFileSync(
			join(templatesDirectory, 'configurations', '.prettierrc.json'),
			join(projectName, '.prettierrc.json')
		);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);
};
