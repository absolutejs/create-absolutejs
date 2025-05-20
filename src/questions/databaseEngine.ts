import { select, isCancel } from '@clack/prompts';
import { cyan, magenta, green, red, blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getDatabaseEngine = async () => {
	const databaseDialectResponse = await select({
		message: 'Database provider:',
		options: [
			{ label: 'None', value: 'none' },
			{ label: cyan('PostgreSQL'), value: 'postgres' },
			{ label: magenta('SQLite'), value: 'sqlite' },
			{ label: green('MySQL'), value: 'mysql' },
			{ label: red('Redis'), value: 'redis' },
			{ label: green('MongoDB'), value: 'mongodb' },
			{ label: magenta('SingleStore'), value: 'singlestore' },
			{ label: yellow('SQL Server'), value: 'mssql' },
			{ label: cyan('CockroachDB'), value: 'cockroachdb' }
		]
	});
	if (isCancel(databaseDialectResponse)) abort();

	return databaseDialectResponse === 'none'
		? undefined
		: databaseDialectResponse;
};
