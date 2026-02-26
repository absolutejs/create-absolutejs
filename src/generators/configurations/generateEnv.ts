import { writeFileSync } from 'fs';
import { join } from 'path';
import { CreateConfiguration } from '../../types';

type GenerateEnvProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'projectName' | 'databaseDirectory'
> & {
	envVariables?: string[];
};

const databaseURLS = {
	cockroachdb: 'postgresql://root@localhost:26257/database',
	gel: 'gel://admin@localhost:5656/main?tls_security=insecure',
	mariadb: 'mysql://root:rootpassword@localhost:3306/database',
	mongodb:
		'mongodb://root:rootpassword@127.0.0.1:27017/database?authSource=admin&directConnection=true',
	mssql:
		'Server=localhost,1433;Database=master;User Id=sa;Password=SApassword1;Encrypt=true;TrustServerCertificate=true',
	mysql: 'mysql://root:rootpassword@localhost:3306/database',
	postgresql: 'postgresql://postgres:rootpassword@localhost:5432/database',
	singlestore: 'mysql://root:rootpassword@localhost:3306/database'
} as const;

export const generateEnv = ({
	databaseEngine,
	databaseHost,
	databaseDirectory = 'db',
	envVariables = [],
	projectName
}: GenerateEnvProps) => {
	const vars = [...envVariables];

	if (
		databaseEngine === 'sqlite' &&
		(databaseHost === 'none' || databaseHost === undefined)
	) {
		vars.push(`DATABASE_URL=file:./${databaseDirectory}/database.sqlite`);
	} else if (
		databaseEngine !== 'none' &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		(databaseHost === 'none' || databaseHost === undefined)
	) {
		vars.push(`DATABASE_URL=${databaseURLS[databaseEngine]}`);
	}

	if (vars.length === 0) return;

	const envPath = join(projectName, '.env');
	writeFileSync(envPath, vars.join('\n'), 'utf8');
};
