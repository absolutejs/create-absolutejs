import { CreateConfiguration } from '../../types';
import { dbHandlerTemplates } from './handlerTemplates';

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

	let ormKey: 'drizzle' | 'sql' = 'sql';
	if (orm === 'drizzle') ormKey = 'drizzle';

	const kind = usesAuth ? 'auth' : 'count';
	const key = `${databaseEngine}:${ormKey}:${host}:${kind}` as const;

	// @ts-expect-error - Need to add the rest of the templates
	return dbHandlerTemplates[key];
};
