import type { CreateConfiguration } from '../../types';
import {
	getAuthTemplate,
	getCountTemplate,
	type DriverConfigurationKey
} from './handlerTemplates';

type GenerateDBHandlersProps = Pick<
	CreateConfiguration,
	'databaseDirectory' | 'databaseEngine' | 'databaseHost' | 'orm'
> & { usesAuth: boolean };

const defaultDbDir = 'db';

export const generateDBHandlers = ({
	databaseDirectory = defaultDbDir,
	databaseEngine,
	databaseHost,
	orm,
	usesAuth
}: GenerateDBHandlersProps) => {
	if (databaseEngine === undefined || databaseEngine === 'none') {
		throw new Error(
			'Internal Error: databaseEngine is undefined or "none".'
		);
	}

	const host =
		databaseHost && databaseHost !== 'none' ? databaseHost : 'local';
	let ormKey = 'sql';
	if (orm === 'drizzle') ormKey = 'drizzle';
	else if (orm === 'prisma') ormKey = 'prisma';
	const key = `${databaseEngine}:${ormKey}:${host}` as DriverConfigurationKey;

	return usesAuth
		? getAuthTemplate(key, databaseDirectory)
		: getCountTemplate(key, databaseDirectory);
};
