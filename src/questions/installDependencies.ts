import { isCancel, confirm } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getInstallDependencies = async () => {
	const installDependencies = await confirm({
		message: 'Install dependencies now?'
	});
	if (isCancel(installDependencies)) abort();

	return installDependencies;
};
