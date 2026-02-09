import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { isDrizzleDialect, isPrismaDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { toDockerProjectName } from '../../utils/toDockerProjectName';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generatePrismaClient } from '../configurations/generatePrismaClient';
import { generateDatabaseTypes } from './generateDatabaseTypes';
import { generateDockerContainer } from './generateDockerContainer';
import { generateDrizzleSchema } from './generateDrizzleSchema';
import { generateDBHandlers } from './generateHandlers';
import { generatePrismaSchema } from './generatePrismaSchema';
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
	backendDirectory: string;
	databaseDirectory: string;
	databasePort?: number;
	typesDirectory: string;
};

export const scaffoldDatabase = async ({
	projectName,
	databaseEngine,
	databaseHost,
	databaseDirectory,
	databasePort,
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
		databaseDirectory,
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
		const schemaPath = `${databaseDirectory}/schema.sql`;
		await $`sqlite3 ${databaseDirectory}/database.sqlite ".read ${schemaPath}"`.cwd(
			projectName
		);
	}

	// For Prisma, we need to create the docker-compose file but skip schema initialization
	// For Drizzle and no ORM, we use scaffoldDocker which handles schema initialization
	if (
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		databasePort !== undefined
	) {
		if (orm === 'prisma') {
			await checkDockerInstalled(databaseEngine);
			const dbContainer = generateDockerContainer(
				databaseEngine,
				databasePort
			);
			writeFileSync(
				join(projectDatabaseDirectory, 'docker-compose.db.yml'),
				dbContainer,
				'utf-8'
			);
		} else {
			await scaffoldDocker({
				authOption,
				databaseDirectory,
				databaseEngine,
				hostPort: databasePort,
				projectDatabaseDirectory,
				projectName
			});
		}
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

	if (orm !== 'prisma') return;

	if (!isPrismaDialect(databaseEngine)) {
		throw new Error('Internal type error: Expected a Prisma dialect');
	}

	const prismaSchema = generatePrismaSchema({
		authOption,
		databaseEngine,
		databaseHost
	});

	const schemaPath = join(projectDatabaseDirectory, 'schema.prisma');
	writeFileSync(schemaPath, prismaSchema);

	generatePrismaClient({
		databaseDirectory,
		databaseHost,
		projectName
	});

	const schemaArg = `${databaseDirectory}/schema.prisma`;
	const projectCwd = join(projectName);

	try {
		await $`npx prisma generate --schema ${schemaArg}`.cwd(projectCwd);
	} catch (error) {
		console.error('Error generating Prisma client:', error);
	}

	const isLocalDatabase = !databaseHost || databaseHost === 'none';
	if (!isLocalDatabase) return;

	// For non-SQLite databases, ensure Docker container is running before migrations
	if (databaseEngine !== 'sqlite') {
		try {
			await $`bun db:reset`.cwd(projectCwd).nothrow();
			await $`bun db:up`.cwd(projectCwd);
			// Wait for database to be ready using appropriate wait command
			const { initTemplates } = await import('./dockerInitTemplates');
			if (databaseEngine in initTemplates) {
				const waitCommand =
					initTemplates[databaseEngine as keyof typeof initTemplates]
						?.wait;
				if (waitCommand) {
					await $`docker compose -p ${toDockerProjectName(projectName)} -f ${databaseDirectory}/docker-compose.db.yml exec -T db bash -lc '${waitCommand}'`
						.cwd(projectCwd)
						.nothrow();
				}
			} else {
				// Fallback for databases not in initTemplates (e.g., MongoDB): wait 5 seconds
				await new Promise((resolve) => setTimeout(resolve, 5000));
			}
		} catch (error) {
			console.error('Error starting database container:', error);
		}
	}

	if (databaseEngine === 'sqlite' || databaseEngine === 'mongodb') {
		const result = await $`npx prisma db push --schema ${schemaArg}`
			.cwd(projectCwd)
			.nothrow();
		if (result.exitCode !== 0)
			console.error('Error running Prisma migrations:', result.stderr);

		return;
	}

	const result =
		await $`npx prisma migrate dev --name init --skip-generate --schema ${schemaArg}`
			.cwd(projectCwd)
			.nothrow();
	if (result.exitCode !== 0)
		console.error('Error running Prisma migrations:', result.stderr);
};
