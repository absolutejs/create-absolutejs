import { copyFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import type { PromptResponse } from '../types';

type AddConfigurationProps = Pick<
	PromptResponse,
	'tailwind' | 'language' | 'initializeGit' | 'codeQualityTool'
> & {
	templatesDir: string;
	root: string;
};

export const addConfigurationFiles = ({
	tailwind,
	templatesDir,
	language,
	codeQualityTool,
	initializeGit,
	root
}: AddConfigurationProps) => {
	if (tailwind) {
		copyFileSync(
			join(templatesDir, 'tailwind', 'postcss.config.ts'),
			join(root, 'postcss.config.ts')
		);
		copyFileSync(
			join(templatesDir, 'tailwind', 'tailwind.config.ts'),
			join(root, 'tailwind.config.ts')
		);
	}
	if (initializeGit)
		copyFileSync(
			join(templatesDir, '.gitignore'),
			join(root, '.gitignore')
		);
	if (language === 'ts')
		copyFileSync(
			join(templatesDir, 'tsconfig.example.json'),
			join(root, 'tsconfig.json')
		);
	if (codeQualityTool === 'eslint+prettier') {
		copyFileSync(
			join(templatesDir, 'eslint.config.mjs'),
			join(root, 'eslint.config.mjs')
		);
		copyFileSync(
			join(templatesDir, '.prettierignore'),
			join(root, '.prettierignore')
		);
		copyFileSync(
			join(templatesDir, '.prettierrc.json'),
			join(root, '.prettierrc.json')
		);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);
};
