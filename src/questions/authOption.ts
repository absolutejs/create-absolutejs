import { select, isCancel } from '@clack/prompts';
import { cyan } from 'picocolors';
import { abort } from '../utils/abort';

export const getAuthOption = async () => {
	const authOption = await select({
		message: 'Auth provider:',
		options: [
			{ label: 'None', value: 'none' },
			{ label: cyan('Absolute Auth'), value: 'abs' }
		]
	});
	if (isCancel(authOption)) abort();

	return authOption === 'none' ? undefined : authOption;
};
