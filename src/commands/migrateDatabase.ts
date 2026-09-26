import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, yellow } from 'picocolors';
import type { CreateConfiguration } from '../types';
import {
	isDockerDaemonRunning,
	resolveDockerExe
} from '../utils/checkDockerInstalled';

type MigrateDatabaseProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'projectName'
> & {
	verifyLocalDatabase: boolean;
};

const applyMigrations = async (projectName: string) =>
	(await $`bun run db:migrate`.cwd(projectName).quiet().nothrow())
		.exitCode === 0;

const migrateDockerDatabase = async (
	projectName: string,
	databaseEngine: string
) => {
	if (!(await isDockerDaemonRunning())) return false;
	const docker = resolveDockerExe();
	const compose = [
		'compose',
		'-p',
		databaseEngine,
		'-f',
		'db/docker-compose.db.yml'
	];
	const started = await $`${docker} ${compose} up -d --wait db`
		.cwd(projectName)
		.quiet()
		.nothrow();
	if (started.exitCode !== 0) return false;
	const migrated = await applyMigrations(projectName);
	await $`${docker} ${compose} down`.cwd(projectName).quiet().nothrow();

	return migrated;
};

/* Applies the project's committed initial migration once dependencies are
   installed, so a fresh Drizzle project's example tables exist on first run.
   Local SQLite and the default local libSQL file for Turso migrate directly;
   a Docker database is migrated only when the daemon is already up and the
   scaffold verified it. Hosted databases are left to `db:migrate`, which needs
   the real DATABASE_URL. Returns whether the migration ran. */
export const migrateDatabase = async ({
	databaseEngine,
	databaseHost,
	projectName,
	verifyLocalDatabase
}: MigrateDatabaseProps) => {
	const isLocal = databaseHost === undefined || databaseHost === 'none';
	const isFileDatabase =
		databaseEngine === 'sqlite' && (isLocal || databaseHost === 'turso');
	const isDockerDatabase =
		isLocal &&
		verifyLocalDatabase &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== 'sqlite';
	if (!isFileDatabase && !isDockerDatabase) return false;

	const spin = spinner();
	spin.start('Applying database migrations');
	const migrated = isFileDatabase
		? await applyMigrations(projectName)
		: await migrateDockerDatabase(projectName, databaseEngine ?? 'db');
	spin.stop(
		migrated
			? green('Database migrated')
			: yellow('Database not migrated — run db:migrate once it is up')
	);

	return migrated;
};
