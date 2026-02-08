import { writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { AuthOption, DatabaseEngine } from '../../types';
import {
	checkDockerInstalled,
	ensureDockerDaemonRunning,
	shutdownDockerDaemon
} from '../../utils/checkDockerInstalled';
import {
	countHistoryTables,
	initTemplates,
	userTables
} from './dockerInitTemplates';
import { generateDockerContainer } from './generateDockerContainer';

type ScaffoldDockerProps = {
	databaseEngine: DatabaseEngine;
	projectDatabaseDirectory: string;
	authOption: AuthOption;
	projectName: string;
};

export const scaffoldDocker = async ({
	databaseEngine,
	projectDatabaseDirectory,
	projectName,
	authOption
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

	await checkDockerInstalled(databaseEngine);
	const { daemonWasStarted } = await ensureDockerDaemonRunning();
	const dbContainer = generateDockerContainer(databaseEngine);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);

	const hasSchemaInit = databaseEngine in userTables;
	if (hasSchemaInit) {
		const dbKey = databaseEngine as keyof typeof userTables;
		const { wait, cli } = initTemplates[dbKey];
		const usesAuth = authOption !== undefined && authOption !== 'none';
		const dbCommand = usesAuth
			? userTables[dbKey]
			: countHistoryTables[dbKey];
		await $`bun db:up`.cwd(projectName);
		await $`docker compose -p ${databaseEngine} -f db/docker-compose.db.yml exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`.cwd(projectName);
		await $`bun db:down`.cwd(projectName);
	} else {
		await $`bun db:up`.cwd(projectName);
		await $`bun db:down`.cwd(projectName);
	}

	if (daemonWasStarted) {
		await shutdownDockerDaemon();
	}
};
