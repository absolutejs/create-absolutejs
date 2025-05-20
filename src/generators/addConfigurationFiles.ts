import { copyFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { PromptResponse } from '../types';

type AddConfigurationProps = Pick<
	PromptResponse,
	'tailwind' | 'language' | 'initializeGitNow' | 'codeQualityTool'
> & {
	templatesDir: string;
	projectName: string;
};

export const addConfigurationFiles = ({
	tailwind,
	templatesDir,
	language,
	codeQualityTool,
	initializeGitNow,
	projectName
}: AddConfigurationProps) => {
	if (tailwind) {
		copyFileSync(
			join(templatesDir, 'tailwind', 'postcss.config.ts'),
			join(projectName, 'postcss.config.ts')
		);
		copyFileSync(
			join(templatesDir, 'tailwind', 'tailwind.config.ts'),
			join(projectName, 'tailwind.config.ts')
		);
	}
	if (initializeGitNow)
		copyFileSync(
			join(templatesDir, 'git', '.gitignore'),
			join(projectName, '.gitignore')
		);
	if (language === 'ts')
		copyFileSync(
			join(templatesDir, 'configurations', 'tsconfig.example.json'),
			join(projectName, 'tsconfig.json')
		);
	if (codeQualityTool === 'eslint+prettier') {
		copyFileSync(
			join(templatesDir, 'configurations', 'eslint.config.mjs'),
			join(projectName, 'eslint.config.mjs')
		);
		copyFileSync(
			join(templatesDir, 'configurations', '.prettierignore'),
			join(projectName, '.prettierignore')
		);
		copyFileSync(
			join(templatesDir, 'configurations', '.prettierrc.json'),
			join(projectName, '.prettierrc.json')
		);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);
};
