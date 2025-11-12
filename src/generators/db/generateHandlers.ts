import { CreateConfiguration } from '../../types';
import { getAuthTemplate, getCountTemplate } from './handlerTemplates';

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
	// MongoDB uses 'native' instead of 'sql' when no ORM is selected
	const ormKey = databaseEngine === 'mongodb' && orm === 'none' 
		? 'native' 
		: (orm === 'drizzle' ? 'drizzle' : 'sql');
	const key = `${databaseEngine}:${ormKey}:${host}` as const;

	// @ts-expect-error - TODO: Finish the other templates
	return usesAuth ? getAuthTemplate(key) : getCountTemplate(key);
};
