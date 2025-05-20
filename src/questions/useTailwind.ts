import { isCancel, confirm } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getUseTailwind = async () => {
	const useTailwind = await confirm({ message: 'Add Tailwind support?' });
	if (isCancel(useTailwind)) abort();

	return useTailwind;
};
