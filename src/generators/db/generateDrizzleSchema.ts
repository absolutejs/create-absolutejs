import { AuthOption, AvailableDrizzleDialect } from '../../types';

type DialectSchema = {
	int: string;
	json: string;
	jsonDefault?: string;
	pkg: string;
	string: string;
	table: string;
	time: string;
	timestampDefault: string;
	uid: string;
};

const mysqlFamily = {
	int: 'int',
	json: 'json()',
	string: 'varchar({ length: 255 })',
	time: 'timestamp()',
	timestampDefault: '.defaultNow()',
	uid: "int('uid').primaryKey().autoincrement()"
} as const;

const DIALECTS: Record<AvailableDrizzleDialect, DialectSchema> = {
	cockroachdb: {
		int: 'int4',
		json: 'jsonb()',
		pkg: 'cockroach-core',
		string: 'varchar({ length: 255 })',
		table: 'cockroachTable',
		time: 'timestamp()',
		timestampDefault: '.defaultNow()',
		uid: "int4('uid').primaryKey().generatedAlwaysAsIdentity()"
	},
	mariadb: { ...mysqlFamily, pkg: 'mysql-core', table: 'mysqlTable' },
	mssql: {
		int: 'int',
		json: "nvarchar({ length: 'max', mode: 'json' })",
		pkg: 'mssql-core',
		string: 'nvarchar({ length: 255 })',
		table: 'mssqlTable',
		time: 'datetime2()',
		timestampDefault: '.default(sql`sysdatetime()`)',
		uid: "int('uid').identity().primaryKey()"
	},
	mysql: { ...mysqlFamily, pkg: 'mysql-core', table: 'mysqlTable' },
	postgresql: {
		int: 'integer',
		json: 'jsonb()',
		pkg: 'pg-core',
		string: 'varchar({ length: 255 })',
		table: 'pgTable',
		time: 'timestamp()',
		timestampDefault: '.defaultNow()',
		uid: "integer('uid').primaryKey().generatedAlwaysAsIdentity()"
	},
	singlestore: {
		...mysqlFamily,
		/* SingleStore rejects MySQL's parenthesised expression default
		   (DEFAULT ('{}')), which is what drizzle-kit emits for .default({}). */
		jsonDefault: ".default(sql`'{}'`)",
		pkg: 'singlestore-core',
		table: 'singlestoreTable'
	},
	sqlite: {
		int: 'integer',
		json: "text('', { mode: 'json' })",
		pkg: 'sqlite-core',
		string: 'text()',
		table: 'sqliteTable',
		time: "integer({ mode: 'timestamp_ms' })",
		/* Milliseconds since the Unix epoch: julianday() counts days from
		   2440587.5 (the epoch's Julian day). drizzle-kit only accepts a
		   parameter-free SQL default, so the constants are inline. */
		timestampDefault:
			".default(sql`((julianday('now') - 2440587.5) * 86400000)`)",
		uid: "integer('uid').primaryKey({ autoIncrement: true })"
	}
};

type GenerateSchemaProps = {
	databaseEngine: AvailableDrizzleDialect;
	authOption: AuthOption;
};

const builder = (expr: string) => expr.split('(')[0] ?? expr;

export const generateDrizzleSchema = ({
	databaseEngine,
	authOption
}: GenerateSchemaProps) => {
	const cfg = DIALECTS[databaseEngine];
	const usesAuth = authOption === 'abs';

	const importBuilders = usesAuth
		? [cfg.table, builder(cfg.string), builder(cfg.time), builder(cfg.json)]
		: [cfg.table, cfg.int, builder(cfg.time)];
	const uniqueBuilders = Array.from(new Set(importBuilders));
	const jsonDefault = cfg.jsonDefault ?? '.default({})';
	const usesSqlDefault = [
		cfg.timestampDefault,
		usesAuth ? jsonDefault : ''
	].some((expression) => expression.includes('sql`'));

	const imports = [
		usesSqlDefault ? "import { sql } from 'drizzle-orm';" : '',
		usesAuth
			? "import type { UserIdentity } from '../src/types/userIdentity';"
			: '',
		`import { ${uniqueBuilders.join(', ')} } from 'drizzle-orm/${cfg.pkg}';`
	]
		.filter(Boolean)
		.join('\n');

	const timestampColumn = `${cfg.time}.notNull()${cfg.timestampDefault}`;

	const tableBlock = usesAuth
		? `export const users = ${cfg.table}('users', {
  auth_sub: ${cfg.string}.primaryKey(),
  created_at: ${timestampColumn},
  metadata: ${cfg.json}.$type<UserIdentity>()${jsonDefault}
});`
		: `export const countHistory = ${cfg.table}('count_history', {
  uid: ${cfg.uid},
  count: ${cfg.int}('count').notNull(),
  created_at: ${timestampColumn}
});`;

	const schemaKey = usesAuth ? 'users' : 'countHistory';

	return `
${imports}

${tableBlock}

export const schema = {
  ${schemaKey}
};
`;
};
