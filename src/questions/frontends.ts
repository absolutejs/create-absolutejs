import { multiselect, isCancel } from '@clack/prompts';
import { availableFrontends, frontendLabels } from '../data';
import { isFrontend } from '../typeGuards';
import { abort } from '../utils/abort';

export const getFrontends = async () => {
	const frontends = await multiselect({
		message: 'Frontend(s) (space to select, enter to finish):',
		options: availableFrontends.map((value) => ({
			label: frontendLabels[value],
			value
		}))
	});

	if (isCancel(frontends)) abort();

	return frontends.filter(isFrontend);
};
