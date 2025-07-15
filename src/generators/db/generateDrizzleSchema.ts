import {
	AuthProvider,
	AvailableDrizzleDialect,
	DatabaseHost
} from '../../types';

const DIALECTS = {
	gel: {
		builders: ['text', 'gelTable', 'timestamp', 'integer'],
		json: 'text()',
		pkg: 'gel-core',
		string: 'text()',
		table: 'gelTable',
		time: 'timestamp()'
	},
	mysql: {
		builders: ['json', 'mysqlTable', 'timestamp', 'varchar', 'int'],
		json: 'json()',
		pkg: 'mysql-core',
		string: 'varchar({ length: 255 })',
		table: 'mysqlTable',
		time: 'timestamp()'
	},
	postgresql: {
		builders: ['jsonb', 'pgTable', 'timestamp', 'varchar', 'integer'],
		json: 'jsonb()',
		pkg: 'pg-core',
		string: 'varchar({ length: 255 })',
		table: 'pgTable',
		time: 'timestamp()'
	},
	singlestore: {
		builders: ['json', 'singlestoreTable', 'timestamp', 'varchar', 'int'],
		json: 'json()',
		pkg: 'singlestore-core',
		string: 'varchar({ length: 255 })',
		table: 'singlestoreTable',
		time: 'timestamp()'
	},
	sqlite: {
		builders: ['text', 'sqliteTable', 'integer'],
		json: "text('', { mode: 'json' })",
		pkg: 'sqlite-core',
		string: 'text()',
		table: 'sqliteTable',
		time: "integer({ mode: 'timestamp' })"
	}
} as const;

type GenerateSchemaProps = {
	databaseEngine: AvailableDrizzleDialect;
	databaseHost: DatabaseHost;
	authProvider: AuthProvider;
};

const builder = (expr: string) => expr.split('(')[0];

export const generateDrizzleSchema = ({
	databaseEngine,
	databaseHost,
	authProvider
}: GenerateSchemaProps) => {
	const cfg = DIALECTS[databaseEngine];
	const intBuilder =
		databaseEngine === 'mysql' || databaseEngine === 'singlestore'
			? 'int'
			: 'integer';
	const timeBuilder = builder(cfg.time);
	const jsonBuilder = builder(cfg.json);
	const stringBuilder = builder(cfg.string);

	const importBuilders =
		authProvider === 'absoluteAuth'
			? [cfg.table, stringBuilder, timeBuilder, jsonBuilder]
			: [cfg.table, intBuilder, timeBuilder];
	const uniqueBuilders = Array.from(new Set(importBuilders));
	const builderImport = `import { ${uniqueBuilders.join(
		', '
	)} } from 'drizzle-orm/${cfg.pkg}';`;

	const sqliteImports =
		databaseEngine === 'sqlite'
			? `import { sql } from 'drizzle-orm';\n`
			: '';

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

	let uidColumn: string;
	if (databaseEngine === 'mysql' || databaseEngine === 'singlestore') {
		uidColumn = `${intBuilder}('uid').primaryKey().autoincrement()`;
	} else if (databaseEngine === 'sqlite') {
		uidColumn = `integer('uid').primaryKey({ autoIncrement: true })`;
	} else {
		uidColumn = `integer('uid').primaryKey().generatedAlwaysAsIdentity()`;
	}

	const constsBlock =
		databaseEngine === 'sqlite'
			? `const JULIAN_DAY_UNIX_EPOCH_OFFSET = 2440587.5;
const MILLIS_PER_DAY = 86400000;\n\n`
			: '';

	const timestampColumn =
		databaseEngine === 'sqlite'
			? `${cfg.time}.notNull().default(sql\`(julianday('now') - \${JULIAN_DAY_UNIX_EPOCH_OFFSET}) * \${MILLIS_PER_DAY}\`)`
			: `${cfg.time}.notNull().defaultNow()`;

	const tableBlock =
		authProvider === 'absoluteAuth'
			? `export const users = ${cfg.table}('users', {
  auth_sub: ${cfg.string}.primaryKey(),
  created_at: ${timestampColumn},
  metadata: ${cfg.json}.$type<Record<string, unknown>>().default({})
});`
			: `export const countHistory = ${cfg.table}('count_history', {
  uid: ${uidColumn},
  count: ${intBuilder}('count').notNull(),
  created_at: ${timestampColumn}
});`;

	const schemaKey =
		authProvider === 'absoluteAuth' ? 'users' : 'countHistory';
	const extraTypes =
		authProvider === 'absoluteAuth'
			? `export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;`
			: `export type CountHistory = typeof countHistory.$inferSelect;
export type NewCountHistory = typeof countHistory.$inferInsert;`;

	return `
${sqliteImports}${builderImport}
${dbImport}

${constsBlock}${tableBlock}

export const schema = {
  ${schemaKey}
};

export type SchemaType = typeof schema;
${dbTypeLine ? `${dbTypeLine}\n\n` : '\n'}${extraTypes}
`;
};
