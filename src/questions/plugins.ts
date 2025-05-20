import { multiselect, isCancel } from '@clack/prompts';
import { availablePlugins } from '../data';
import { abort } from '../utils/abort';

export const getPlugins = async () => {
	const plugins = await multiselect({
		message:
			'Select additional Elysia plugins (space to select, enter to submit):',
		options: availablePlugins,
		required: false
	});
	if (isCancel(plugins)) abort();

	return plugins;
};
