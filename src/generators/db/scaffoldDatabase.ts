import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { isDrizzleDialect, isPrismaDialect } from '../../typeGuards';
import type { CreateConfiguration } from '../../types';
import { checkSqliteInstalled } from '../../utils/checkSqliteInstalled';
import { checkDockerInstalled } from '../../utils/checkDockerInstalled';
import { createDrizzleConfig } from '../configurations/generateDrizzleConfig';
import { generatePrismaClient } from '../configurations/generatePrismaClient';
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

	// For Prisma, we need to create the docker-compose file but skip schema initialization
	// For Drizzle and no ORM, we use scaffoldDocker which handles schema initialization
	if (
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none'
	) {
		if (orm === 'prisma') {
			// For Prisma, just create the docker-compose file without initializing schema
			await checkDockerInstalled();
			const dbContainer = generateDockerContainer(databaseEngine);
			writeFileSync(
				join(projectDatabaseDirectory, 'docker-compose.db.yml'),
				dbContainer,
				'utf-8'
			);
		} else {
			await scaffoldDocker({
				authProvider,
				databaseEngine,
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

	if (orm !== 'prisma') return;

	if (!isPrismaDialect(databaseEngine)) {
		throw new Error('Internal type error: Expected a Prisma dialect');
	}

	const prismaSchema = generatePrismaSchema({
		authProvider,
		databaseEngine,
		databaseHost
	});

	const schemaPath = join(projectDatabaseDirectory, 'schema.prisma');
	writeFileSync(schemaPath, prismaSchema);

	generatePrismaClient({
		databaseDirectory, databaseHost, projectName
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
			await $`bun db:up`.cwd(projectCwd);
			// Wait for database to be ready using appropriate wait command
			const { initTemplates } = await import('./dockerInitTemplates');
			if (databaseEngine in initTemplates) {
				const waitCommand = initTemplates[databaseEngine as keyof typeof initTemplates]?.wait;
				if (waitCommand) {
					await $`docker compose -p ${databaseEngine} -f ${databaseDirectory}/docker-compose.db.yml exec -T db bash -lc '${waitCommand}'`.cwd(projectCwd).nothrow();
				}
			} else {
				// Fallback for databases not in initTemplates (e.g., MongoDB): wait 5 seconds
				await new Promise(resolve => setTimeout(resolve, 5000));
			}
		} catch (error) {
			console.error('Error starting database container:', error);
		}
	}

	if (databaseEngine === 'sqlite') {
		const result = await $`npx prisma db push --schema ${schemaArg}`.cwd(projectCwd).nothrow();
		if (result.exitCode !== 0) console.error('Error running Prisma migrations:', result.stderr);

		return;
	}

	const result = await $`npx prisma migrate dev --name init --skip-generate --schema ${schemaArg}`.cwd(projectCwd).nothrow();
	if (result.exitCode !== 0) console.error('Error running Prisma migrations:', result.stderr);
	
};
