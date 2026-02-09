import { writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { AuthOption, DatabaseEngine } from '../../types';
import {
	checkDockerInstalled,
	ensureDockerDaemonRunning,
	getDockerEnv,
	shutdownDockerDaemon
} from '../../utils/checkDockerInstalled';
import {
	countHistoryTables,
	initTemplates,
	userTables
} from './dockerInitTemplates';
import { generateDockerContainer } from './generateDockerContainer';

type ScaffoldDockerProps = {
	authOption: AuthOption;
	databaseEngine: DatabaseEngine;
	hostPort: number;
	projectDatabaseDirectory: string;
	projectName: string;
};

export const scaffoldDocker = async ({
	authOption,
	databaseEngine,
	hostPort,
	projectDatabaseDirectory,
	projectName
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
	const dbContainer = generateDockerContainer(databaseEngine, hostPort);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);

	const dockerEnv = await getDockerEnv();
	const runDbDown = () =>
		$`bun db:down`.cwd(projectName).env(dockerEnv).quiet().nothrow();

	// Pre-flight: clean up any leftover container from a previous killed scaffold
	await runDbDown();

	const hasSchemaInit = databaseEngine in userTables;
	const runDbUpAndInit = async () => {
		if (!hasSchemaInit) {
			await $`bun db:up`.cwd(projectName).env(dockerEnv);

			return;
		}
		const dbKey = databaseEngine as keyof typeof userTables;
		const { wait, cli } = initTemplates[dbKey];
		const usesAuth = authOption !== undefined && authOption !== 'none';
		const dbCommand = usesAuth
			? userTables[dbKey]
			: countHistoryTables[dbKey];
		await $`bun db:up`.cwd(projectName).env(dockerEnv);
		await $`docker compose -p ${databaseEngine} -f db/docker-compose.db.yml exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`
			.cwd(projectName)
			.env(dockerEnv);
	};

	try {
		await runDbUpAndInit();
	} finally {
		await runDbDown();
	}

	if (daemonWasStarted) {
		await shutdownDockerDaemon();
	}
};
