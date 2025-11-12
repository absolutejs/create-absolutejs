import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDrizzleSchema } from './generateDrizzleSchema';
import { generateDBHandlers } from './generateHandlers';
import { generateSqliteSchema } from './generateSqliteSchema';
import { generatePrismaSchema } from './generatePrismaSchema';
import { scaffoldDocker } from './scaffoldDocker';
import { isPrismaDialect } from '../../typeGuards';
import { generatePrismaClient } from '../configurations/generatePrismaClient';



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
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none'
	) {
		await scaffoldDocker({
			authProvider,
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
		if (!isPrismaDialect(databaseEngine)) {
			throw new Error('Internal type error: Expected a Prisma dialect');
		}

		const prismaSchema = generatePrismaSchema({
			authProvider,
			databaseEngine,
			databaseHost
		});
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.prisma'),
			prismaSchema
		);
		generatePrismaClient({
			databaseEngine,
			databaseHost,
			databaseDirectory,
			projectName
		});
		try {
			await $`npx prisma generate --schema ${databaseDirectory}/schema.prisma`.cwd(join(projectName));
		} catch (error) {
			console.error('Error generating Prisma client:', error);
		}
		const isLocalDatabase = !databaseHost || databaseHost === 'none';
		if (isLocalDatabase && databaseEngine !== 'sqlite') {
			try {
				await $`npx prisma migrate dev --name init --skip-generate --schema ${databaseDirectory}/schema.prisma`.cwd(projectName);
			} catch (error) {
				console.error('Error running Prisma migration:', error);
			}
		} else if (isLocalDatabase) {
			console.log('Skipping initial Prisma migration for SQLite database.');
		}
	}
	return;
};
