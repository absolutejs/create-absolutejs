import { select, isCancel } from '@clack/prompts';
import { cyan } from 'picocolors';
import { abort } from '../utils/abort';

export const getAuthProvider = async () => {
	const authProvider = await select({
		message: 'Auth provider:',
		options: [
			{ label: 'None', value: 'none' },
			{ label: cyan('Absolute Auth'), value: 'absoluteAuth' }
		]
	});
	if (isCancel(authProvider)) abort();

	return authProvider === 'none' ? undefined : authProvider;
};
