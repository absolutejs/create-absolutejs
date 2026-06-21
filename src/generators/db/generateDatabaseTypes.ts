import { isDrizzleDialect } from '../../typeGuards';
import { AuthOption, DatabaseEngine, DatabaseHost, ORM } from '../../types';

type GenerateTypesProps = {
	databaseEngine: DatabaseEngine;
	databaseHost: DatabaseHost;
	authOption: AuthOption;
	orm?: ORM;
};

// Driver type used as `DatabaseType` on the raw-SQL (no-ORM) path. Keyed by
// `${engine}:${host}` where host is 'none' for a locally-hosted engine. These
// MUST stay in sync with the `dbType` values in handlerTemplates.ts and the
// `const db = ...` expression in generateDBBlock.ts, otherwise the generated
// handler's `db` parameter type won't match the value the server constructs.
const SQL_DRIVER_TYPES: Record<
	string,
	{ typeName: string; importLine: string }
> = {
	'cockroachdb:none': {
		importLine: `import type { SQL } from 'bun';`,
		typeName: 'SQL'
	},
	'gel:none': {
		importLine: `import type { Client } from 'gel';`,
		typeName: 'Client'
	},
	'mariadb:none': {
		importLine: `import type { SQL } from 'bun';`,
		typeName: 'SQL'
	},
	'mongodb:none': {
		importLine: `import type { Db } from 'mongodb';`,
		typeName: 'Db'
	},
	'mssql:none': {
		importLine: `import type { ConnectionPool } from 'mssql';`,
		typeName: 'ConnectionPool'
	},
	'mysql:none': {
		importLine: `import type { SQL } from 'bun';`,
		typeName: 'SQL'
	},
	'mysql:planetscale': {
		importLine: `import type { Client } from '@planetscale/database';`,
		typeName: 'Client'
	},
	'postgresql:neon': {
		importLine: `import type { Pool } from '@neondatabase/serverless';`,
		typeName: 'Pool'
	},
	'postgresql:none': {
		importLine: `import type { SQL } from 'bun';`,
		typeName: 'SQL'
	},
	'postgresql:planetscale': {
		importLine: `import type { Pool } from 'pg';`,
		typeName: 'Pool'
	},
	'singlestore:none': {
		importLine: `import type { Pool } from 'mysql2/promise';`,
		typeName: 'Pool'
	},
	'sqlite:none': {
		importLine: `import type { Database } from 'bun:sqlite';`,
		typeName: 'Database'
	},
	'sqlite:turso': {
		importLine: `import type { Client } from '@libsql/client';`,
		typeName: 'Client'
	}
};

// Raw-SQL (no-ORM) `databaseTypes.ts`. The drizzle path infers User/NewUser
// from the schema's `$inferSelect`/`$inferInsert`; without an ORM there is no
// schema module, so we hand-roll types that mirror the columns emitted by
// generateSqliteSchema / the relational DDL. Returns rows are untyped at the
// driver level, so these are the source of truth for consumers (auth config,
// handlers, the example page).
const generateSqlDatabaseTypes = ({
	databaseEngine,
	databaseHost,
	authOption
}: GenerateTypesProps) => {
	const host =
		databaseHost && databaseHost !== 'none' ? databaseHost : 'none';
	const driver = SQL_DRIVER_TYPES[`${databaseEngine}:${host}`];
	const driverImport = driver ? `${driver.importLine}\n` : '';
	const databaseTypeLine = driver
		? `export type DatabaseType = ${driver.typeName};`
		: 'export type DatabaseType = unknown;';

	const entityTypes =
		authOption === 'abs'
			? `export type User = {
	auth_sub: string;
	created_at: Date;
	metadata: Record<string, unknown>;
};

export type NewUser = {
	auth_sub: string;
	metadata?: Record<string, unknown>;
};`
			: `export type CountHistory = {
	uid: number;
	count: number;
	created_at: Date;
};

export type NewCountHistory = {
	count: number;
};`;

	return `${driverImport}
${databaseTypeLine}

${entityTypes}
`;
};

export const generateDatabaseTypes = ({
	databaseEngine,
	databaseHost,
	authOption,
	orm
}: GenerateTypesProps) => {
	if (orm !== 'drizzle') {
		return generateSqlDatabaseTypes({
			authOption,
			databaseEngine,
			databaseHost
		});
	}

	let dbImport = '';
	let dbTypeLine = '';

	if (databaseHost === 'neon') {
		dbImport = `import { NeonHttpDatabase } from 'drizzle-orm/neon-http';`;
		dbTypeLine = 'export type DatabaseType = NeonHttpDatabase<SchemaType>;';
	} else if (databaseHost === 'planetscale' && databaseEngine === 'mysql') {
		dbImport = `import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';`;
		dbTypeLine =
			'export type DatabaseType = PlanetScaleDatabase<SchemaType>;';
	} else if (
		databaseHost === 'planetscale' &&
		databaseEngine === 'postgresql'
	) {
		dbImport = `import { NodePgDatabase } from 'drizzle-orm/node-postgres';`;
		dbTypeLine = 'export type DatabaseType = NodePgDatabase<SchemaType>;';
	} else if (databaseHost === 'turso') {
		dbImport = `import { LibSQLDatabase } from 'drizzle-orm/libsql';`;
		dbTypeLine = 'export type DatabaseType = LibSQLDatabase<SchemaType>;';
	}

	if (
		(!databaseHost || databaseHost === 'none') &&
		isDrizzleDialect(databaseEngine)
	) {
		switch (databaseEngine) {
			case 'gel':
				dbImport = `import { GelJsDatabase } from 'drizzle-orm/gel';`;
				dbTypeLine =
					'export type DatabaseType = GelJsDatabase<SchemaType>;';
				break;
			case 'mariadb':
			case 'mysql':
				dbImport = `import { Mysql2Database } from 'drizzle-orm/mysql2';`;
				dbTypeLine =
					'export type DatabaseType = Mysql2Database<SchemaType>;';
				break;
			case 'mssql':
				dbImport = `import { NodeMssqlDatabase } from 'drizzle-orm/node-mssql';`;
				dbTypeLine =
					'export type DatabaseType = NodeMssqlDatabase<SchemaType>;';
				break;
			case 'postgresql':
				dbImport = `import { BunSQLDatabase } from 'drizzle-orm/bun-sql';`;
				dbTypeLine =
					'export type DatabaseType = BunSQLDatabase<SchemaType>;';
				break;
			case 'singlestore':
				dbImport = `import { SingleStoreDriverDatabase } from 'drizzle-orm/singlestore';`;
				dbTypeLine =
					'export type DatabaseType = SingleStoreDriverDatabase<SchemaType>;';
				break;
			case 'sqlite':
				dbImport = `import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';`;
				dbTypeLine =
					'export type DatabaseType = BunSQLiteDatabase<SchemaType>;';
				break;
		}
	}

	const schemaImport =
		authOption === 'abs'
			? `import { users, schema } from '../../db/schema';`
			: `import { countHistory } from '../../db/schema';`;
	const extraTypes =
		authOption === 'abs'
			? `export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;`
			: `export type CountHistory = typeof countHistory.$inferSelect;
export type NewCountHistory = typeof countHistory.$inferInsert;`;

	return `${schemaImport}
${dbImport}

${`${dbTypeLine}\n`}export type SchemaType = typeof schema;\n\n${extraTypes}
`;
};
