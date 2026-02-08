import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration, DatabaseEngine } from '../../types';

type GenerateEnvProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'projectName'
> & {
	databasePort?: number;
	envVariables?: string[];
};

const urlBuilders: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	(port: number) => string
> = {
	cockroachdb: (port) => `postgresql://root@localhost:${port}/database`,
	gel: (port) => `gel://admin@localhost:${port}/main?tls_security=insecure`,
	mariadb: (port) => `mariadb://user:userpassword@localhost:${port}/database`,
	mongodb: (port) => `mongodb://user:password@localhost:${port}/database`,
	mssql: (port) =>
		`Server=localhost,${port};Database=master;User Id=sa;Password=SApassword1;Encrypt=true;TrustServerCertificate=true`,
	mysql: (port) => `mysql://user:userpassword@localhost:${port}/database`,
	postgresql: (port) =>
		`postgresql://user:password@localhost:${port}/database`,
	singlestore: (port) => `mysql://root:password@localhost:${port}/database`
};

export const generateEnv = ({
	databaseEngine,
	databaseHost,
	databasePort,
	envVariables = [],
	projectName
}: GenerateEnvProps) => {
	const vars = [...envVariables];

	if (
		databaseEngine !== 'sqlite' &&
		databaseEngine !== 'none' &&
		databaseEngine !== undefined &&
		(databaseHost === 'none' || databaseHost === undefined) &&
		databasePort !== undefined
	) {
		const databaseURL = urlBuilders[databaseEngine](databasePort);
		vars.push(`DATABASE_URL=${databaseURL}`);
	}

	if (vars.length === 0) return;

	const envPath = join(projectName, '.env');
	writeFileSync(envPath, vars.join('\n'), 'utf8');
};
