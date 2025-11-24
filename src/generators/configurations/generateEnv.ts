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
	cockroachdb: 'postgresql://root@localhost:26257/database',
	gel: 'gel://user:password@localhost:5432/database',
	mariadb: 'mariadb://user:userpassword@localhost:3306/database',
	mongodb: 'mongodb://user:password@localhost:27017/database',
	mssql: 'Server=localhost,1433;Database=master;User Id=sa;Password=SApassword1;Encrypt=true;TrustServerCertificate=true',
	mysql: 'mysql://user:userpassword@localhost:3306/database',
	postgresql: 'postgresql://user:password@localhost:5432/database',
	singlestore: 'mysql://root:password@localhost:3306/database'
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
