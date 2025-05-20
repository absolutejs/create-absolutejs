import { isCancel, confirm } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getInitializeGit = async () => {
	const initializeGitNow = await confirm({
		message: 'Initialize a git repository?'
	});
	if (isCancel(initializeGitNow)) abort();

	return initializeGitNow;
};
