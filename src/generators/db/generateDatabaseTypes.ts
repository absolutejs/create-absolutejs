import { isDrizzleDialect } from '../../typeGuards';
import { AuthOption, DatabaseEngine, DatabaseHost } from '../../types';

type GenerateTypesProps = {
	databaseEngine: DatabaseEngine;
	databaseHost: DatabaseHost;
	authOption: AuthOption;
};

export const generateDatabaseTypes = ({
	databaseEngine,
	databaseHost,
	authOption
}: GenerateTypesProps) => {
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
