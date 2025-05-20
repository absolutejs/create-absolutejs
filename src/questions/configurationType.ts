import { select, isCancel } from '@clack/prompts';
import { blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getConfigurationType = async () => {
	const configType = await select({
		message: 'Select configuration:',
		options: [
			{ label: blueBright('Default'), value: 'default' },
			{ label: yellow('Custom'), value: 'custom' }
		]
	});
	if (isCancel(configType)) abort();

	return configType;
};
