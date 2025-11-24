import { isDrizzleDialect } from '../../typeGuards';
import { AuthProvider, DatabaseEngine, DatabaseHost } from '../../types';

type GenerateTypesProps = {
	databaseEngine: DatabaseEngine;
	databaseHost: DatabaseHost;
	authProvider: AuthProvider;
};

export const generateDatabaseTypes = ({
	databaseEngine,
	databaseHost,
	authProvider
}: GenerateTypesProps) => {
	let dbImport = '';
	let dbTypeLine = '';

	if (databaseHost === 'neon') {
		dbImport = `import { NeonHttpDatabase } from 'drizzle-orm/neon-http';`;
		dbTypeLine = 'export type DatabaseType = NeonHttpDatabase<SchemaType>;';
	} else if (databaseHost === 'planetscale') {
		dbImport = `import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';`;
		dbTypeLine =
			'export type DatabaseType = PlanetScaleDatabase<SchemaType>;';
	} else if (databaseHost === 'turso') {
		dbImport = `import { LibSQLDatabase } from 'drizzle-orm/libsql';`;
		dbTypeLine = 'export type DatabaseType = LibSQLDatabase<SchemaType>;';
	}

	if (
		(!databaseHost || databaseHost === 'none') &&
		isDrizzleDialect(databaseEngine)
	) {
		switch (databaseEngine) {
			case 'mariadb':
			case 'mysql':
				dbImport = `import { Mysql2Database } from 'drizzle-orm/mysql2';`;
				dbTypeLine =
					'export type DatabaseType = Mysql2Database<SchemaType>;';
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
		authProvider === 'absoluteAuth'
			? `import { users, SchemaType } from '../../db/schema';`
			: `import { countHistory, SchemaType } from '../../db/schema';`;
	const extraTypes =
		authProvider === 'absoluteAuth'
			? `export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;`
			: `export type CountHistory = typeof countHistory.$inferSelect;
export type NewCountHistory = typeof countHistory.$inferInsert;`;

	return `${schemaImport}
${dbImport}

${dbTypeLine ? `${dbTypeLine}\n\n` : '\n'}${extraTypes}
`;
};
