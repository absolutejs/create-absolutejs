import {
	AuthProvider,
	AvailableDrizzleDialect,
	DatabaseHost
} from '../../types';

type GenerateTypesProps = {
    databaseHost: DatabaseHost;
    authProvider: AuthProvider;
};

export const generateDatabaseTypes = ({
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