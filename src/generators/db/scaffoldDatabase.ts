import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { dim, yellow } from 'picocolors';
import { isDrizzleDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generateDatabaseTypes } from './generateDatabaseTypes';
import { generateDrizzleSchema } from './generateDrizzleSchema';
import { generateDBHandlers } from './generateHandlers';
import {
	generateRelationalSchema,
	supportsRelationalSchema
} from './generateRelationalSchema';
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
}: ScaffoldDatabaseProps): Promise<{ dockerFreshInstall: boolean }> => {
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

	// Raw-SQL (no-ORM) handlers import `DatabaseType` (and `NewUser` on the auth
	// path) from types/databaseTypes (so do the auth config and the example
	// page), but the drizzle-backed type module below is only written on the
	// drizzle path. Generate a self-contained, driver-typed version here so the
	// non-drizzle scaffold actually type-checks and builds.
	if (orm !== 'drizzle') {
		mkdirSync(typesDirectory, { recursive: true });
		const sqlTypes = generateDatabaseTypes({
			authOption,
			databaseEngine,
			databaseHost,
			orm
		});
		writeFileSync(join(typesDirectory, 'databaseTypes.ts'), sqlTypes);
	}

	// Hosted relational engines on the raw-SQL path get no migration tooling
	// (no drizzle-kit, no local sqlite3). Emit a plain DDL file so the tables
	// the handlers query can be created against the hosted database.
	const isRemoteHost = databaseHost !== undefined && databaseHost !== 'none';
	if (
		isRemoteHost &&
		orm !== 'drizzle' &&
		supportsRelationalSchema(databaseEngine)
	) {
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.sql'),
			generateRelationalSchema(databaseEngine, authOption)
		);
	}

	if (databaseEngine === 'sqlite') {
		// The sqlite3 CLI is a developer convenience (a db shell), never a
		// scaffold requirement — seeding goes through bun:sqlite below, which
		// ships with the runtime. The check only nudges interactive users;
		// headless runs (the Studio container, CI) skip it entirely.
		void (
			(orm === undefined || orm === 'none') &&
			(await checkSqliteInstalled())
		);
		const sqliteSchema = generateSqliteSchema(authOption);
		writeFileSync(
			join(projectDatabaseDirectory, 'schema.sql'),
			sqliteSchema
		);
		const { Database } = await import('bun:sqlite');
		const seeded = new Database(
			join(projectName, databaseDirectory, 'database.sqlite')
		);
		seeded.run(sqliteSchema);
		seeded.close();
	}

	if (
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none'
	) {
		const { dockerFreshInstall } = await scaffoldDocker({
			authOption,
			databaseEngine,
			projectDatabaseDirectory,
			projectName
		});

		return { dockerFreshInstall };
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
			databaseHost,
			orm
		});
		writeFileSync(join(typesDirectory, 'databaseTypes.ts'), drizzleTypes);

		return { dockerFreshInstall: false };
	}

	if (orm === 'prisma') {
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Prisma support is not implemented yet`
		);
	}

	return { dockerFreshInstall: false };
};
