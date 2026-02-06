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
	const ormKey =
		databaseEngine === 'mongodb' && orm !== 'drizzle'
			? 'native'
			: orm === 'drizzle'
				? 'drizzle'
				: 'sql';
	const key = `${databaseEngine}:${ormKey}:${host}` as const;

	// @ts-expect-error - TODO: Finish the other templates
	return usesAuth ? getAuthTemplate(key) : getCountTemplate(key);
};
