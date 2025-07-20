import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDBHandlers } from './generateDBHandlers';
import { generateDrizzleSchema } from './generateDrizzleSchema';

type ScaffoldDatabaseProps = Pick<
	CreateConfiguration,
	| 'projectName'
	| 'databaseHost'
	| 'orm'
	| 'databaseDirectory'
	| 'authProvider'
	| 'databaseEngine'
> & {
	databaseDirectory: string;
	templatesDirectory: string;
	backendDirectory: string;
};

export const scaffoldDatabase = async ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	backendDirectory,
	templatesDirectory,
	authProvider,
	orm
}: ScaffoldDatabaseProps) => {
	const projectDatabaseDirectory = join(projectName, databaseDirectory);
	const handlerDirectory = join(backendDirectory, 'handlers');
	mkdirSync(projectDatabaseDirectory, { recursive: true });
	mkdirSync(handlerDirectory, { recursive: true });

	const usesAuth = authProvider !== undefined && authProvider !== 'none';
	const handlerFileName = usesAuth
		? 'userHandlers.ts'
		: 'countHistoryHandlers.ts';
	const dbHandlers = generateDBHandlers(usesAuth);
	writeFileSync(join(handlerDirectory, handlerFileName), dbHandlers, 'utf-8');

	if (
		databaseEngine === 'postgresql' &&
		(databaseHost === undefined || databaseHost === 'none')
	) {
		await checkDockerInstalled();
		copyFileSync(
			join(templatesDirectory, 'db', 'docker-compose.db.yml'),
			join(projectDatabaseDirectory, 'docker-compose.db.yml')
		);
	}

	if (orm === 'drizzle') {
		if (!isDrizzleDialect(databaseEngine)) {
			throw new Error('Internal type error: Expected a Drizzle dialect');
		}

		const drizzleSchema = generateDrizzleSchema({
			authProvider,
			databaseEngine,
			databaseHost
		});
		const schemaFilePath = join(projectDatabaseDirectory, 'schema.ts');
		writeFileSync(schemaFilePath, drizzleSchema);
		createDrizzleConfig({ databaseDirectory, databaseEngine, projectName });

		return;
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}
};
