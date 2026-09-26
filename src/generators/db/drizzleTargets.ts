import type { AvailableDrizzleDialect, DatabaseHost } from '../../types';

/* The `dialect` values drizzle-kit 1.0 accepts in drizzle.config.ts. Turso is
   its own kit dialect (libSQL over HTTP/WebSocket with an auth token), even
   though its tables are written with sqlite-core. */
export const drizzleKitDialects = [
	'cockroach',
	'mssql',
	'mysql',
	'postgresql',
	'singlestore',
	'sqlite',
	'turso'
] as const;

export type DrizzleKitDialect = (typeof drizzleKitDialects)[number];

const engineKitDialects: Record<AvailableDrizzleDialect, DrizzleKitDialect> = {
	cockroachdb: 'cockroach',
	mariadb: 'mysql',
	mssql: 'mssql',
	mysql: 'mysql',
	postgresql: 'postgresql',
	singlestore: 'singlestore',
	sqlite: 'sqlite'
};

export const getDrizzleKitDialect = (
	databaseEngine: AvailableDrizzleDialect,
	databaseHost: DatabaseHost
) =>
	databaseEngine === 'sqlite' && databaseHost === 'turso'
		? 'turso'
		: engineKitDialects[databaseEngine];

/* The directory holding the committed initial migration for a kit dialect and
   example table (users when auth is on, count_history otherwise). */
export const getMigrationTemplateName = (
	kitDialect: DrizzleKitDialect,
	usesAuth: boolean
) => `${kitDialect}-${usesAuth ? 'users' : 'count-history'}`;
