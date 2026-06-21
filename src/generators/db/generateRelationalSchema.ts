import { AuthOption, DatabaseEngine } from '../../types';

// Plain SQL DDL for the raw-SQL (no-ORM) hosted path. The drizzle path pushes
// its schema via drizzle-kit and the sqlite path has its own generator; this
// covers the relational engines (postgres/mysql families) so a `db/schema.sql`
// exists for the user (or the studio) to apply against the hosted database.
// Mirrors the columns in generateDrizzleSchema / generateSqliteSchema.

type DialectDDL = {
	pk: string; // auto-incrementing primary key column for count_history.uid
	timestamp: string;
	json: string;
	string: string;
};

const DIALECTS: Record<string, DialectDDL> = {
	cockroachdb: {
		json: 'JSONB',
		pk: 'INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
		string: 'VARCHAR(255)',
		timestamp: 'TIMESTAMP NOT NULL DEFAULT now()'
	},
	mariadb: {
		json: 'JSON',
		pk: 'INT AUTO_INCREMENT PRIMARY KEY',
		string: 'VARCHAR(255)',
		timestamp: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
	},
	mysql: {
		json: 'JSON',
		pk: 'INT AUTO_INCREMENT PRIMARY KEY',
		string: 'VARCHAR(255)',
		timestamp: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
	},
	postgresql: {
		json: 'JSONB',
		pk: 'INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
		string: 'VARCHAR(255)',
		timestamp: 'TIMESTAMP NOT NULL DEFAULT now()'
	},
	singlestore: {
		json: 'JSON',
		pk: 'INT AUTO_INCREMENT PRIMARY KEY',
		string: 'VARCHAR(255)',
		timestamp: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
	}
};

export const supportsRelationalSchema = (engine: DatabaseEngine): boolean =>
	engine !== undefined && engine in DIALECTS;

export const generateRelationalSchema = (
	databaseEngine: DatabaseEngine,
	authOption: AuthOption
): string => {
	if (databaseEngine === undefined || !(databaseEngine in DIALECTS)) {
		throw new Error(
			`Internal error: no relational DDL for engine "${databaseEngine}"`
		);
	}
	const d = DIALECTS[databaseEngine]!;

	return authOption === 'abs'
		? `CREATE TABLE IF NOT EXISTS users (
  auth_sub ${d.string} PRIMARY KEY,
  created_at ${d.timestamp},
  metadata ${d.json} DEFAULT ('{}')
);
`
		: `CREATE TABLE IF NOT EXISTS count_history (
  uid ${d.pk},
  count INT NOT NULL,
  created_at ${d.timestamp}
);
`;
};
