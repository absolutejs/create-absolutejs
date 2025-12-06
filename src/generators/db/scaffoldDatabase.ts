import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDatabaseTypes } from './generateDatabaseTypes';
import { generateDrizzleSchema } from './generateDrizzleSchema';
import { generateDBHandlers } from './generateHandlers';
import { generateSqliteSchema } from './generateSqliteSchema';
import { scaffoldDocker } from './scaffoldDocker';

type ScaffoldDatabaseProps = Pick<
	CreateConfiguration,
	| 'projectName'
	| 'databaseHost'
	| 'orm'
	| 'databaseDirectory'
	| 'authOption'
	| 'databaseEngine'
> & {
	databaseDirectory: string;
	backendDirectory: string;
	typesDirectory: string;
};

export const scaffoldDatabase = async ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	backendDirectory,
	authOption,
	orm,
	typesDirectory
}: ScaffoldDatabaseProps) => {
	const projectDatabaseDirectory = join(projectName, databaseDirectory);
	const handlerDirectory = join(backendDirectory, 'handlers');
	mkdirSync(projectDatabaseDirectory, { recursive: true });
	mkdirSync(handlerDirectory, { recursive: true });

	const usesAuth = authOption !== undefined && authOption !== 'none';
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
		const sqliteSchema = generateSqliteSchema(authOption);
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
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none'
	) {
		await scaffoldDocker({
			authOption,
			databaseEngine,
			projectDatabaseDirectory,
			projectName
		});
	}

	if (orm === 'drizzle') {
		if (!isDrizzleDialect(databaseEngine)) {
			throw new Error('Internal type error: Expected a Drizzle dialect');
		}

		const drizzleSchema = generateDrizzleSchema({
			authOption,
			databaseEngine
		});
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.ts'),
			drizzleSchema
		);
		createDrizzleConfig({ databaseDirectory, databaseEngine, projectName });

		const drizzleTypes = generateDatabaseTypes({
			authOption,
			databaseEngine,
			databaseHost
		});
		writeFileSync(join(typesDirectory, 'databaseTypes.ts'), drizzleTypes);

		return;
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}
};
