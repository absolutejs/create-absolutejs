import { writeFileSync } from 'fs';
import { join } from 'path';
import { DatabaseEngine } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { generateDatabaseContainer } from './generateDBContainer';

export const scaffoldDocker = async (
	databaseEngine: DatabaseEngine,
	projectDatabaseDirectory: string
) => {
	await checkDockerInstalled();
	const dbContainer = generateDatabaseContainer(databaseEngine);
	writeFileSync(
		join(projectDatabaseDirectory, 'docker-compose.db.yml'),
		dbContainer,
		'utf-8'
	);
};
