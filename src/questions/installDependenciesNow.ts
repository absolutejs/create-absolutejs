import { isCancel, confirm } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getInstallDependencies = async () => {
	const installDependenciesNow = await confirm({
		message: 'Install dependencies now?'
	});
	if (isCancel(installDependenciesNow)) abort();

	return installDependenciesNow;
};
