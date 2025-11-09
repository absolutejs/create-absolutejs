import { writeFileSync } from 'fs';
import process from 'node:process';
import { join } from 'path';
import { $ } from 'bun';
import { AuthProvider, DatabaseEngine } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import {
	countHistoryTables,
	initTemplates,
	userTables
} from './dockerInitTemplates';
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
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: databaseEngine must be defined and not "none" or "sqlite"'
		);
	}

	await checkDockerInstalled();
	const useSharedContainer =
		process.env.ABSOLUTE_TEST === 'true' &&
		(databaseEngine === 'postgresql' ||
			databaseEngine === 'mysql' ||
			databaseEngine === 'mariadb');

	const dbContainer = generateDockerContainer(databaseEngine);
	const composePath = join(projectDatabaseDirectory, 'docker-compose.db.yml');
	writeFileSync(composePath, dbContainer, 'utf-8');

	if (databaseEngine !== 'mongodb') {
		if (useSharedContainer) {
			return;
		}

		const { wait, cli } = initTemplates[databaseEngine];
		const usesAuth = authProvider !== undefined && authProvider !== 'none';
		const dbCommand = usesAuth
			? userTables[databaseEngine]
			: countHistoryTables[databaseEngine];
		await $`bun db:up`.cwd(projectName);
		await $`docker compose -p ${databaseEngine} -f db/docker-compose.db.yml exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`.cwd(projectName);
		await $`bun db:down`.cwd(projectName);
	}
};
