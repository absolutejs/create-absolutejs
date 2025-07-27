import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration, DatabaseEngine } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDatabaseContainer } from './generateDBContainer';
import { generateDBHandlers } from './generateDBHandlers';
import { generateDrizzleSchema } from './generateDrizzleSchema';
import { generateSqliteSchema } from './generateSqliteSchema';

const scaffoldDocker = async (
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
	backendDirectory: string;
};

export const scaffoldDatabase = async ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	backendDirectory,
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
	const dbHandlers = generateDBHandlers({
		databaseEngine,
		databaseHost,
		orm,
		usesAuth
	});
	writeFileSync(join(handlerDirectory, handlerFileName), dbHandlers, 'utf-8');

	if (databaseEngine === 'sqlite') {
		void (
			(orm === undefined || orm === 'none') &&
			(await checkSqliteInstalled())
		);
		const sqliteSchema = generateSqliteSchema(authProvider);
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.sql'),
			sqliteSchema
		);
		await $`sqlite3 ${databaseDirectory}/database.sqlite ".read ${join(
			databaseDirectory,
			'schema.sql'
		)}"`.cwd(projectName);
	}

	if (
		databaseEngine !== 'sqlite' &&
		(databaseHost === undefined || databaseHost === 'none')
	) {
		await scaffoldDocker(databaseEngine, projectDatabaseDirectory);
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
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.ts'),
			drizzleSchema
		);
		createDrizzleConfig({ databaseDirectory, databaseEngine, projectName });

		return;
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}
};
