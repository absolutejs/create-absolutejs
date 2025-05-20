import { select, isCancel } from '@clack/prompts';
import { cyan, magenta } from 'picocolors';
import { abort } from '../utils/abort';

export const getORM = async () => {
	const orm = await select({
		message: 'Choose an ORM (optional):',
		options: [
			{ label: 'None', value: 'none' },
			{ label: cyan('Drizzle'), value: 'drizzle' },
			{ label: magenta('Prisma'), value: 'prisma' }
		]
	});
	if (isCancel(orm)) abort();

	return orm === 'none' ? undefined : orm;
};
