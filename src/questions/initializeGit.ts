import { isCancel, confirm } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getInitializeGit = async () => {
	const initializeGit = await confirm({
		message: 'Initialize a git repository?'
	});
	if (isCancel(initializeGit)) abort();

	return initializeGit;
};
