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
		dbImport = `import type { drizzle } from 'drizzle-orm/neon-http';`;
		dbTypeLine = 'export type DatabaseType = ReturnType<typeof drizzle>;';
	} else if (databaseHost === 'planetscale' && databaseEngine === 'mysql') {
		dbImport = `import type { drizzle } from 'drizzle-orm/planetscale-serverless';`;
		dbTypeLine = 'export type DatabaseType = ReturnType<typeof drizzle>;';
	} else if (
		databaseHost === 'planetscale' &&
		databaseEngine === 'postgresql'
	) {
		dbImport = `import type { drizzle } from 'drizzle-orm/node-postgres';`;
		dbTypeLine = 'export type DatabaseType = ReturnType<typeof drizzle>;';
	} else if (databaseHost === 'turso') {
		dbImport = `import type { drizzle } from 'drizzle-orm/libsql';`;
		dbTypeLine = 'export type DatabaseType = ReturnType<typeof drizzle>;';
	}

	if (
		(!databaseHost || databaseHost === 'none') &&
		isDrizzleDialect(databaseEngine)
	) {
		switch (databaseEngine) {
			case 'cockroachdb':
				dbImport = `import type { drizzle } from 'drizzle-orm/cockroach';`;
				dbTypeLine =
					'export type DatabaseType = ReturnType<typeof drizzle>;';
				break;
			case 'mariadb':
			case 'mysql':
				dbImport = `import type { MySql2Database } from 'drizzle-orm/mysql2';`;
				dbTypeLine = 'export type DatabaseType = MySql2Database;';
				break;
			case 'mssql':
				dbImport = `import type { NodeMsSqlDatabase } from 'drizzle-orm/node-mssql';`;
				dbTypeLine = 'export type DatabaseType = NodeMsSqlDatabase;';
				break;
			case 'postgresql':
				dbImport = `import type { drizzle } from 'drizzle-orm/bun-sql';`;
				dbTypeLine =
					'export type DatabaseType = ReturnType<typeof drizzle>;';
				break;
			case 'singlestore':
				dbImport = `import type { SingleStoreDriverDatabase } from 'drizzle-orm/singlestore';`;
				dbTypeLine =
					'export type DatabaseType = SingleStoreDriverDatabase;';
				break;
			case 'sqlite':
				dbImport = `import type { drizzle } from 'drizzle-orm/bun-sqlite';`;
				dbTypeLine =
					'export type DatabaseType = ReturnType<typeof drizzle>;';
				break;
		}
	}

	const schemaImport =
		authOption === 'abs'
			? `import { users, schema } from '../../db/schema';`
			: `import { countHistory, schema } from '../../db/schema';`;
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
