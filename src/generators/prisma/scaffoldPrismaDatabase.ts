import { cpSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { isPrismaDialect } from '../../typeGuards';
import type { AuthOption, DatabaseEngine, DatabaseHost } from '../../types';
import {
	checkDockerInstalled,
	ensureDockerDaemonRunning,
	resolveDockerExe,
	shutdownDockerDaemon
} from '../../utils/checkDockerInstalled';
import { scaffoldDocker } from '../db/scaffoldDocker';
import {
	generatePrismaDatabaseTypes,
	generatePrismaHandlers
} from './generatePrismaCode';
import {
	generateLibsqlMigrateScript,
	generatePrismaConfig
} from './generatePrismaConfig';
import { generatePrismaSchema } from './generatePrismaSchema';
import {
	getPrismaMigrationTemplateName,
	getPrismaTarget,
	type PrismaTarget
} from './prismaTargets';

type ScaffoldPrismaDatabaseProps = {
	authOption: AuthOption;
	backendDirectory: string;
	databaseDirectory: string;
	databaseEngine: DatabaseEngine;
	databaseHost: DatabaseHost;
	projectName: string;
	typesDirectory: string;
	verifyLocalDatabase: boolean;
};

/* Prisma requires MongoDB to run as a replica set (it writes through
   transactions). A single-node set is initiated by the healthcheck itself,
   which only passes once the node is PRIMARY — so `db:up --wait` is followed
   safely by `db:migrate`. */
export const prismaMongoDBCompose = `services:
    db:
        image: mongo:7.0
        restart: always
        command: ["--replSet", "rs0", "--bind_ip_all"]
        ports:
            - "27017:27017"
        healthcheck:
            test: ["CMD-SHELL", "mongosh --quiet --eval \\"try { if (rs.status().myState !== 1) quit(1) } catch (error) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] }); quit(1) }\\""]
            interval: 2s
            timeout: 5s
            retries: 30
            start_period: 5s
        volumes:
            - db_data:/data/db

volumes:
    db_data:
`;

/* The local DATABASE_URL a Prisma project starts with, where it differs from
   the no-ORM default generateEnv writes: SQLite needs a URL at all (the libSQL
   adapter and Prisma Migrate both take one), MongoDB is the unauthenticated
   replica set above, and SQL Server uses Prisma's `sqlserver://` format. */
export const getPrismaLocalDatabaseUrl = (
	target: PrismaTarget,
	databaseDirectory: string,
	databaseHost: DatabaseHost
) => {
	const isLocal = databaseHost === undefined || databaseHost === 'none';
	if (!isLocal) return undefined;
	switch (target.provider) {
		case 'mongodb':
			return 'mongodb://localhost:27017/database?replicaSet=rs0&directConnection=true';
		case 'sqlite':
			return `file:./${databaseDirectory}/database.sqlite`;
		case 'sqlserver':
			return 'sqlserver://localhost:1433;database=master;user=sa;password=SApassword1;encrypt=true;trustServerCertificate=true';
		default:
			return undefined;
	}
};

/* Sets DATABASE_URL in the project's own .env, keeping every other line. */
const setProjectDatabaseUrl = (projectName: string, url: string) => {
	const envPath = join(projectName, '.env');
	const lines = existsSync(envPath)
		? readFileSync(envPath, 'utf8')
				.split('\n')
				.filter((line) => !line.startsWith('DATABASE_URL='))
		: [];
	writeFileSync(envPath, [...lines, `DATABASE_URL=${url}`].join('\n'));
};

const verifyMongoDBContainer = async (
	projectName: string,
	databaseDirectory: string
) => {
	const { freshInstall } = await checkDockerInstalled('mongodb');
	const { daemonWasStarted } = await ensureDockerDaemonRunning();
	const docker = resolveDockerExe();
	const compose = [
		'compose',
		'-p',
		'mongodb',
		'-f',
		`${databaseDirectory}/docker-compose.db.yml`
	];
	const spin = spinner();
	spin.start('Starting mongodb replica set');
	try {
		await $`${docker} ${compose} up -d --wait db`.cwd(projectName).quiet();
		await $`${docker} ${compose} down`.cwd(projectName).quiet();
		spin.stop(green('Docker container verified'));
	} catch (error) {
		spin.cancel(red('Docker setup failed'));
		throw error;
	}
	if (daemonWasStarted) await shutdownDockerDaemon();

	return freshInstall;
};

const templatesDirectory = () =>
	join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

/* Scaffolds a Prisma project's database layer: schema, prisma.config.ts, the
   committed initial migration, typed handlers and types, local .env URL and
   the Docker database. Everything is written under `projectName`. */
export const scaffoldPrismaDatabase = async ({
	authOption,
	backendDirectory,
	databaseDirectory,
	databaseEngine,
	databaseHost,
	projectName,
	typesDirectory,
	verifyLocalDatabase
}: ScaffoldPrismaDatabaseProps) => {
	if (!isPrismaDialect(databaseEngine))
		throw new Error(
			`Internal type error: "${databaseEngine}" is not a Prisma database`
		);
	const target = getPrismaTarget(databaseEngine, databaseHost);
	const projectDatabaseDirectory = join(projectName, databaseDirectory);
	const usesAuth = authOption === 'abs';

	writeFileSync(
		join(projectDatabaseDirectory, 'schema.prisma'),
		generatePrismaSchema({ authOption, databaseDirectory, target })
	);
	writeFileSync(
		join(projectName, 'prisma.config.ts'),
		generatePrismaConfig({ databaseDirectory, target })
	);
	if (target.provider !== 'mongodb')
		cpSync(
			join(
				templatesDirectory(),
				'db',
				'migrations',
				getPrismaMigrationTemplateName(target.provider, usesAuth)
			),
			join(projectDatabaseDirectory, 'migrations'),
			{ recursive: true }
		);
	if (target.migration === 'libsql')
		writeFileSync(
			join(projectDatabaseDirectory, 'migrate.ts'),
			generateLibsqlMigrateScript()
		);

	writeFileSync(
		join(
			backendDirectory,
			'handlers',
			usesAuth ? 'userHandlers.ts' : 'countHistoryHandlers.ts'
		),
		generatePrismaHandlers(authOption, target)
	);
	writeFileSync(
		join(typesDirectory, 'databaseTypes.ts'),
		generatePrismaDatabaseTypes(authOption, target)
	);

	const localUrl = getPrismaLocalDatabaseUrl(
		target,
		databaseDirectory,
		databaseHost
	);
	if (localUrl) setProjectDatabaseUrl(projectName, localUrl);

	const isLocal = databaseHost === undefined || databaseHost === 'none';
	if (!isLocal || target.provider === 'sqlite') return false;

	if (target.provider === 'mongodb') {
		writeFileSync(
			join(projectDatabaseDirectory, 'docker-compose.db.yml'),
			prismaMongoDBCompose
		);

		return (
			verifyLocalDatabase &&
			verifyMongoDBContainer(projectName, databaseDirectory)
		);
	}

	/* Migrations own the schema, so the container is only verified. */
	const { dockerFreshInstall } = await scaffoldDocker({
		authOption,
		databaseEngine,
		initializeSchema: false,
		projectDatabaseDirectory,
		projectName,
		verifyLocalDatabase
	});

	return dockerFreshInstall;
};
