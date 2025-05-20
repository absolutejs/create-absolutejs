import { select, isCancel } from '@clack/prompts';
import { blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getCodeQualityTool = async () => {
	const codeQualityTool = await select({
		message: 'Choose linting and formatting tool:',
		options: [
			{
				label: blueBright('ESLint + Prettier'),
				value: 'eslint+prettier'
			},
			{ label: yellow('Biome'), value: 'biome' }
		]
	});
	if (isCancel(codeQualityTool)) abort();

	return codeQualityTool;
};
