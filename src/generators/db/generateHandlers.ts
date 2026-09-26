import { CreateConfiguration } from '../../types';
import {
	getAuthTemplate,
	getCountTemplate,
	isDriverConfigurationKey
} from './handlerTemplates';

type GenerateDBHandlersProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'orm'
> & { usesAuth: boolean };

export const generateDBHandlers = ({
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
	const ormKey = orm === 'drizzle' ? 'drizzle' : 'sql';
	const key = `${databaseEngine}:${ormKey}:${host}` as const;

	if (!isDriverConfigurationKey(key))
		throw new Error(`Unsupported database configuration: ${key}`);

	return usesAuth ? getAuthTemplate(key) : getCountTemplate(key);
};
