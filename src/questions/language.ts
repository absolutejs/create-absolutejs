import { select, isCancel } from '@clack/prompts';
import { blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getLanguage = async () => {
	const language = await select({
		message: 'Language:',
		options: [
			{ label: blueBright('TypeScript'), value: 'ts' },
			{ label: yellow('JavaScript'), value: 'js' }
		]
	});
	if (isCancel(language)) abort();

	return language;
};
