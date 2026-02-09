import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration, DatabaseEngine } from '../../types';

type GenerateEnvProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'projectName' | 'databaseDirectory'
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
	mariadb: (port) => `mysql://root:rootpassword@localhost:${port}/database`,
	mongodb: (port) =>
		`mongodb://root:rootpassword@localhost:${port}/database?authSource=admin`,
	mssql: (port) =>
		`Server=localhost,${port};Database=master;User Id=sa;Password=SApassword1;Encrypt=true;TrustServerCertificate=true`,
	mysql: (port) => `mysql://root:rootpassword@localhost:${port}/database`,
	postgresql: (port) =>
		`postgresql://postgres:rootpassword@localhost:${port}/database`,
	singlestore: (port) =>
		`mysql://root:rootpassword@localhost:${port}/database`
};

export const generateEnv = ({
	databaseEngine,
	databaseHost,
	databaseDirectory = 'db',
	databasePort,
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
