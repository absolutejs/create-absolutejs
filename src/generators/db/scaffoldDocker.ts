import { writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { AuthOption, DatabaseEngine } from '../../types';
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

	await checkDockerInstalled();
	const dbContainer = generateDockerContainer(databaseEngine);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);

	if (databaseEngine === 'mongodb') {
	} else {
		const { wait, cli } = initTemplates[databaseEngine];
		const usesAuth = authOption !== undefined && authOption !== 'none';
		const dbCommand = usesAuth
			? userTables[databaseEngine]
			: countHistoryTables[databaseEngine];
		await $`bun db:up`.cwd(projectName);
		await $`docker compose -p ${databaseEngine} -f db/docker-compose.db.yml exec -T db \
  bash -lc '${wait} && ${cli} "${dbCommand}"'`.cwd(projectName);
		await $`bun db:down`.cwd(projectName);
	}
};
