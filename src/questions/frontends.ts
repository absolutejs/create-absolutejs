import { multiselect, isCancel } from '@clack/prompts';
import { availableFrontends } from '../data';
import { abort } from '../utils/abort';

export const getFrontends = async () => {
	const frontends = await multiselect({
		message: 'Frontend(s) (space to select, enter to finish):',
		options: Object.entries(availableFrontends).map(
			([value, { label }]) => ({ label, value })
		)
	});

	if (isCancel(frontends)) abort();

	return frontends;
};
