import { writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { AuthProvider, DatabaseEngine } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { countHistoryTables, userTables } from './dockerInitTemplates';
import { generateDockerContainer } from './generateDockerContainer';

type ScaffoldDockerProps = {
	databaseEngine: DatabaseEngine;
	projectDatabaseDirectory: string;
	authProvider: AuthProvider;
	projectName: string;
};

export const scaffoldDocker = async ({
	databaseEngine,
	projectDatabaseDirectory,
	projectName,
	authProvider
}: ScaffoldDockerProps) => {
	await checkDockerInstalled();
	const dbContainer = generateDockerContainer(databaseEngine);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: databaseEngine must be defined and not "none" or "sqlite"'
		);
	}

	if (databaseEngine === 'mongodb') {
	} else {
		const usesAuth = authProvider !== undefined && authProvider !== 'none';
		const dbCommand = usesAuth
			? userTables[databaseEngine]
			: countHistoryTables[databaseEngine];
		await $`bun db:up`.cwd(projectName);
		await $`docker compose -p postgres -f db/docker-compose.db.yml exec -T db \
  bash -lc 'until pg_isready -U user -h localhost --quiet; do sleep 1; done && \
            psql -U user -d database -c "${dbCommand}"'`.cwd(projectName);
		await $`bun db:down`.cwd(projectName);
	}
};
