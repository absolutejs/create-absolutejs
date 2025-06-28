import { select, isCancel } from '@clack/prompts';
import { blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getConfigurationType = async () => {
	const directoryConfig = await select({
		message: 'Choose folder naming configuration:',
		options: [
			{ label: blueBright('Default'), value: 'default' },
			{ label: yellow('Custom'), value: 'custom' }
		]
	});
	if (isCancel(directoryConfig)) abort();

	return directoryConfig;
};
