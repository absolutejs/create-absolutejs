import type { AvailablePrismaDialect, DatabaseHost } from '../../types';

/* The `provider` values a Prisma schema's datasource accepts. MariaDB has no
   provider of its own: Prisma drives it as MySQL. */
export const prismaProviders = [
	'cockroachdb',
	'mongodb',
	'mysql',
	'postgresql',
	'sqlite',
	'sqlserver'
] as const;

export type PrismaProvider = (typeof prismaProviders)[number];

/* How a project's committed schema reaches its database:
   - migrate: `prisma migrate deploy` applies the committed SQL migrations.
   - libsql: Prisma Migrate cannot connect to libSQL/Turso URLs, so a generated
     script applies the same committed SQL migrations through @libsql/client.
   - push: MongoDB has no SQL migrations; `prisma db push` syncs indexes. */
export type PrismaMigrationStrategy = 'libsql' | 'migrate' | 'push';

type PrismaAdapter = {
	className: string;
	/* The constructor call, in terms of `getEnv` (and Bun's `env` for optional
	   variables), exactly as the generated server builds it. */
	expression: string;
	packageName: string;
};

export type PrismaTarget = {
	adapter: PrismaAdapter | undefined;
	/* Prisma 7 (the query compiler + driver adapters) serves every SQL engine.
	   MongoDB is not supported by Prisma 7, so it stays on the Prisma 6 line,
	   whose Rust query engine connects to MongoDB itself. */
	line: 'prisma6' | 'prisma7';
	migration: PrismaMigrationStrategy;
	provider: PrismaProvider;
	/* Whether the provider has a native Json column type. SQL Server does not,
	   so user metadata is stored as serialized JSON text there. */
	supportsJson: boolean;
};

const databaseUrl = "getEnv('DATABASE_URL')";

const pgAdapter: PrismaAdapter = {
	className: 'PrismaPg',
	expression: `new PrismaPg({ connectionString: ${databaseUrl} })`,
	packageName: '@prisma/adapter-pg'
};

const mariadbAdapter: PrismaAdapter = {
	className: 'PrismaMariaDb',
	expression: `new PrismaMariaDb(${databaseUrl})`,
	packageName: '@prisma/adapter-mariadb'
};

/* A local libSQL `file:` URL needs no token; a Turso database does. */
const libsqlAdapter: PrismaAdapter = {
	className: 'PrismaLibSql',
	expression: `new PrismaLibSql({ authToken: env.DATABASE_AUTH_TOKEN, url: ${databaseUrl} })`,
	packageName: '@prisma/adapter-libsql'
};

const sqlTarget = (
	provider: PrismaProvider,
	adapter: PrismaAdapter
): PrismaTarget => ({
	adapter,
	line: 'prisma7',
	migration: 'migrate',
	provider,
	supportsJson: provider !== 'sqlserver'
});

const getPostgresqlTarget = (databaseHost: DatabaseHost) => {
	if (databaseHost !== 'neon') return sqlTarget('postgresql', pgAdapter);

	return sqlTarget('postgresql', {
		className: 'PrismaNeon',
		expression: `new PrismaNeon({ connectionString: ${databaseUrl} })`,
		packageName: '@prisma/adapter-neon'
	});
};

const getMysqlTarget = (databaseHost: DatabaseHost) => {
	if (databaseHost !== 'planetscale')
		return sqlTarget('mysql', mariadbAdapter);

	return sqlTarget('mysql', {
		className: 'PrismaPlanetScale',
		expression: `new PrismaPlanetScale({ url: ${databaseUrl} })`,
		packageName: '@prisma/adapter-planetscale'
	});
};

const engineTargets: Record<
	AvailablePrismaDialect,
	(databaseHost: DatabaseHost) => PrismaTarget
> = {
	mysql: getMysqlTarget,
	postgresql: getPostgresqlTarget,
	cockroachdb: () => sqlTarget('cockroachdb', pgAdapter),
	mariadb: () => sqlTarget('mysql', mariadbAdapter),
	mongodb: () => ({
		adapter: undefined,
		line: 'prisma6',
		migration: 'push',
		provider: 'mongodb',
		supportsJson: true
	}),
	mssql: () =>
		sqlTarget('sqlserver', {
			className: 'PrismaMssql',
			expression: `new PrismaMssql(${databaseUrl})`,
			packageName: '@prisma/adapter-mssql'
		}),
	sqlite: (databaseHost) => ({
		...sqlTarget('sqlite', libsqlAdapter),
		migration: databaseHost === 'turso' ? 'libsql' : 'migrate'
	})
};

/* The initial migration's directory name, in Prisma Migrate's
   `<timestamp>_<name>` format. */
export const initialPrismaMigrationName = '20260926000000_init';
/* Where `prisma generate` writes the client, relative to the project root.
   Fixed (independent of --db-dir) so server, handlers and types import it by
   a stable path. It is build output: ignored by git, ESLint and Prettier. */
export const prismaClientDirectory = 'src/generated/prisma';
/* The value Prisma Migrate records in migrations/migration_lock.toml. Prisma 7
   names SQL Server `mssql` there, not by its schema provider name. */
export const getMigrationLockProvider = (provider: PrismaProvider) =>
	provider === 'sqlserver' ? 'mssql' : provider;
/* The directory holding the committed initial migration for a provider and
   example table (users when auth is on, count_history otherwise). */
export const getPrismaMigrationTemplateName = (
	provider: PrismaProvider,
	usesAuth: boolean
) => `prisma-${provider}-${usesAuth ? 'users' : 'count-history'}`;
/* Resolves the provider, driver adapter and migration strategy for an
   engine/host pair. Hosts are validated beforehand (validateDatabaseSelection),
   so PlanetScale Postgres is plain Postgres over `pg` here. */
export const getPrismaTarget = (
	databaseEngine: AvailablePrismaDialect,
	databaseHost: DatabaseHost
) => engineTargets[databaseEngine](databaseHost);
