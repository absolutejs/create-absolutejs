import { writeFileSync } from 'fs';
import { join } from 'path';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { AuthOption, DatabaseEngine } from '../../types';
import {
	checkDockerInstalled,
	ensureDockerDaemonRunning,
	resolveDockerExe,
	shutdownDockerDaemon
} from '../../utils/checkDockerInstalled';
import { toDockerProjectName } from '../../utils/toDockerProjectName';
import {
	countHistoryTables,
	initTemplates,
	userTables
} from './dockerInitTemplates';
import { generateDockerContainer } from './generateDockerContainer';

type DockerCommandProps = {
	databaseEngine: DatabaseEngine;
	docker: string;
	projectName: string;
	spin: ReturnType<typeof spinner>;
};

type InitDockerSchemaProps = DockerCommandProps & {
	authOption: AuthOption;
};

const initDockerSchema = async ({
	authOption,
	databaseEngine,
	docker,
	projectName,
	spin
}: InitDockerSchemaProps) => {
	const dbKey = databaseEngine as keyof typeof userTables;
	const { wait, cli } = initTemplates[dbKey];
	const usesAuth = authOption !== undefined && authOption !== 'none';
	const dbCommand = usesAuth ? userTables[dbKey] : countHistoryTables[dbKey];
	await $`${docker} compose -p ${databaseEngine} -f db/docker-compose.db.yml up -d db`
		.cwd(projectName)
		.quiet();
	spin.message(`Initializing ${databaseEngine} schema`);
	await $`${docker} compose -p ${databaseEngine} -f db/docker-compose.db.yml exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`
		.cwd(projectName)
		.quiet();
	spin.message(`Stopping ${databaseEngine} container`);
	await $`${docker} compose -p ${databaseEngine} -f db/docker-compose.db.yml down`
		.cwd(projectName)
		.quiet();
};

const verifyDockerContainer = async ({
	databaseEngine,
	docker,
	projectName,
	spin
}: DockerCommandProps) => {
	await $`${docker} compose -p ${databaseEngine} -f db/docker-compose.db.yml up -d --wait db`
		.cwd(projectName)
		.quiet();
	spin.message(`Stopping ${databaseEngine} container`);
	await $`${docker} compose -p ${databaseEngine} -f db/docker-compose.db.yml down`
		.cwd(projectName)
		.quiet();
};

type ScaffoldDockerProps = {
	authOption: AuthOption;
	databaseDirectory: string;
	databaseEngine: DatabaseEngine;
	projectDatabaseDirectory: string;
	projectName: string;
};

export const scaffoldDocker = async ({
	authOption,
	databaseDirectory,
	databaseEngine,
	projectDatabaseDirectory,
	projectName
}: ScaffoldDockerProps): Promise<{ dockerFreshInstall: boolean }> => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: databaseEngine must be defined and not "none" or "sqlite"'
		);
	}

	const { freshInstall } = await checkDockerInstalled(databaseEngine);
	const { daemonWasStarted } = await ensureDockerDaemonRunning();
	const dbContainer = generateDockerContainer(databaseEngine);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);

	const docker = resolveDockerExe();
	const composeFile = `${databaseDirectory}/docker-compose.db.yml`;
	const projectFlag = toDockerProjectName(projectName);
	const spin = spinner();
	spin.start(`Starting ${databaseEngine} container`);

	const dockerAction =
		databaseEngine in userTables
			? () =>
					initDockerSchema({
						authOption,
						databaseEngine,
						docker,
						projectName,
						spin
					})
			: () =>
					verifyDockerContainer({
						databaseEngine,
						docker,
						projectName,
						spin
					});

	try {
		const hasSchemaInit = databaseEngine in userTables;
		if (hasSchemaInit) {
			const dbKey = databaseEngine as keyof typeof userTables;
			const { wait, cli } = initTemplates[dbKey];
			const usesAuth = authOption !== undefined && authOption !== 'none';
			const dbCommand = usesAuth
				? userTables[dbKey]
				: countHistoryTables[dbKey];
			await $`${docker} compose -p ${projectFlag} -f ${composeFile} up -d db`
				.cwd(projectName)
				.quiet();
			spin.message(`Initializing ${databaseEngine} schema`);
			await $`${docker} compose -p ${projectFlag} -f ${composeFile} exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`
				.cwd(projectName)
				.quiet();
			spin.message(`Stopping ${databaseEngine} container`);
			await $`${docker} compose -p ${projectFlag} -f ${composeFile} down`
				.cwd(projectName)
				.quiet();
		} else {
			await $`${docker} compose -p ${projectFlag} -f ${composeFile} up -d --wait db`
				.cwd(projectName)
				.quiet();
			spin.message(`Stopping ${databaseEngine} container`);
			await $`${docker} compose -p ${projectFlag} -f ${composeFile} down`
				.cwd(projectName)
				.quiet();
		}
		spin.stop(green('Docker container verified'));
	} catch (err) {
		spin.cancel(red('Docker setup failed'));
		throw err;
	}

	if (daemonWasStarted) {
		await shutdownDockerDaemon();
	}

	return { dockerFreshInstall: freshInstall };
};
