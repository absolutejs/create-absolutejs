import { writeFileSync } from 'fs';
import { join } from 'path';
import { CreateConfiguration } from '../../types';

type GenerateEnvProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'projectName'
> & {
	envVariables?: string[];
};

const databaseURLS = {
	cockroachdb: 'cockroachdb://user:password@localhost:26257/database',
	gel: 'gel://user:password@localhost:5432/database',
	mariadb: 'mariadb://user:password@localhost:3306/database',
	mongodb: 'mongodb://user:password@localhost:27017/database',
	mssql: 'mssql://user:password@localhost:1433/database',
	mysql: 'mysql://user:password@localhost:3306/database',
	postgresql: 'postgresql://user:password@localhost:5432/database',
	singlestore: 'singlestore://user:password@localhost:3306/database'
} as const;

export const generateEnv = ({
	databaseEngine,
	databaseHost,
	envVariables = [],
	projectName
}: GenerateEnvProps) => {
	const vars = [...envVariables];

	if (
		databaseEngine !== 'sqlite' &&
		databaseEngine !== 'none' &&
		databaseEngine !== undefined &&
		(databaseHost === 'none' || databaseHost === undefined)
	) {
		vars.push(`DATABASE_URL=${databaseURLS[databaseEngine]}`);
	}

	if (vars.length === 0) return;

	const envPath = join(projectName, '.env');
	writeFileSync(envPath, vars.join('\n'), 'utf8');
};
