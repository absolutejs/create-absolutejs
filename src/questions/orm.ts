import { select, isCancel, SelectOptions } from '@clack/prompts';
import { cyan, magenta } from 'picocolors';
import { isDrizzleDialect, isPrismaDialect } from '../typeGuards';
import { DatabaseEngine, ORM } from '../types';
import { abort } from '../utils/abort';

export const getORM = async (
	databaseEngine: Exclude<DatabaseEngine, 'none' | undefined>
) => {
	const options: SelectOptions<ORM>['options'] = [
		{ label: 'None', value: 'none' }
	];

	if (isDrizzleDialect(databaseEngine)) {
		options.push({ label: cyan('Drizzle'), value: 'drizzle' });
	}
	if (isPrismaDialect(databaseEngine)) {
		options.push({ label: magenta('Prisma'), value: 'prisma' });
	}

	const orm = await select<ORM>({
		message: 'Choose an ORM for your database:',
		options
	});
	if (isCancel(orm)) abort();

	return orm === 'none' ? undefined : orm;
};
