import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { argv } from 'process';
import { afterEach, describe, expect, test } from 'bun:test';
import { availableDrizzleDialects, availableORMs } from '../src/data';
import { generateDrizzleConfig } from '../src/generators/configurations/generateDrizzleConfig';
import {
	getDrizzleKitDialect,
	getMigrationTemplateName
} from '../src/generators/db/drizzleTargets';
import { generateDrizzleSchema } from '../src/generators/db/generateDrizzleSchema';
import { generateDBBlock } from '../src/generators/project/generateDBBlock';
import { isDrizzleDialect, isORM } from '../src/typeGuards';
import { parseCommandLineOptions } from '../src/utils/parseCommandLineOptions';
import { validateDatabaseSelection } from '../src/utils/validateDatabaseSelection';

const originalArguments = [...argv];

afterEach(() => {
	argv.splice(0, argv.length, ...originalArguments);
});

const parse = (...options: string[]) => {
	argv.splice(0, argv.length, 'bun', 'create-absolutejs', 'app', ...options);

	return parseCommandLineOptions().argumentConfiguration;
};

describe('isORM', () => {
	test('accepts every ORM the help text offers, including none', () => {
		for (const orm of availableORMs) expect(isORM(orm)).toBe(true);
		expect(isORM(undefined)).toBe(true);
	});

	test('rejects unknown ORMs', () => {
		expect(isORM('sequelize')).toBe(false);
		expect(isORM('')).toBe(false);
	});
});

describe('database selection rules', () => {
	test('every Drizzle dialect is accepted locally', () => {
		for (const databaseEngine of availableDrizzleDialects) {
			expect(
				validateDatabaseSelection({
					databaseEngine,
					databaseHost: 'none',
					orm: 'drizzle'
				}).errors
			).toEqual([]);
		}
	});

	test('CockroachDB is a Drizzle dialect', () => {
		expect(isDrizzleDialect('cockroachdb')).toBe(true);
	});

	test('Gel and MongoDB are refused for Drizzle with a clear message', () => {
		const gel = validateDatabaseSelection({
			databaseEngine: 'gel',
			databaseHost: 'none',
			orm: 'drizzle'
		});
		expect(gel.errors).toEqual([
			'Drizzle ORM 1.0 does not support Gel. Use "--orm none" with "--db gel".'
		]);
		expect(
			validateDatabaseSelection({
				databaseEngine: 'mongodb',
				databaseHost: 'none',
				orm: 'drizzle'
			}).errors[0]
		).toContain('Invalid database engine for Drizzle ORM: "mongodb"');
	});

	test('hosts only accept the engines they serve', () => {
		const accepted = [
			['postgresql', 'neon'],
			['postgresql', 'planetscale'],
			['mysql', 'planetscale'],
			['sqlite', 'turso']
		] as const;
		for (const [databaseEngine, databaseHost] of accepted) {
			expect(
				validateDatabaseSelection({
					databaseEngine,
					databaseHost,
					orm: 'drizzle'
				}).errors
			).toEqual([]);
		}

		const refused = [
			['mssql', 'neon', 'Neon'],
			['cockroachdb', 'planetscale', 'PlanetScale'],
			['singlestore', 'planetscale', 'PlanetScale'],
			['mariadb', 'planetscale', 'PlanetScale'],
			['postgresql', 'turso', 'Turso']
		] as const;
		for (const [databaseEngine, databaseHost, label] of refused) {
			expect(
				validateDatabaseSelection({
					databaseEngine,
					databaseHost,
					orm: 'drizzle'
				}).errors
			).toEqual([
				expect.stringContaining(
					`Invalid database engine for ${label}: "${databaseEngine}"`
				)
			]);
		}
	});

	test('Turso without an engine selects SQLite', () => {
		expect(
			validateDatabaseSelection({
				databaseEngine: undefined,
				databaseHost: 'turso',
				orm: 'drizzle'
			})
		).toEqual({ databaseEngine: 'sqlite', errors: [] });
	});
});

describe('command line parsing', () => {
	test('--orm none is accepted', () => {
		expect(parse('--db', 'sqlite', '--orm', 'none').orm).toBe('none');
	});

	test('--orm drizzle with CockroachDB is accepted', () => {
		const parsed = parse('--db', 'cockroachdb', '--orm', 'drizzle');
		expect(parsed.databaseEngine).toBe('cockroachdb');
		expect(parsed.orm).toBe('drizzle');
	});

	test('--db-host turso resolves the engine to sqlite', () => {
		const parsed = parse('--db-host', 'turso', '--orm', 'drizzle');
		expect(parsed.databaseEngine).toBe('sqlite');
		expect(parsed.databaseHost).toBe('turso');
	});
});

describe('drizzle-kit configuration', () => {
	test('each engine maps to its drizzle-kit dialect', () => {
		const expected = {
			cockroachdb: 'cockroach',
			mariadb: 'mysql',
			mssql: 'mssql',
			mysql: 'mysql',
			postgresql: 'postgresql',
			singlestore: 'singlestore',
			sqlite: 'sqlite'
		} as const;
		for (const databaseEngine of availableDrizzleDialects) {
			const config = generateDrizzleConfig({
				databaseDirectory: 'db',
				databaseEngine,
				databaseHost: 'none'
			});
			expect(config).toContain(`dialect: '${expected[databaseEngine]}'`);
			expect(config).toContain("out: 'db/migrations'");
		}
	});

	test('local SQLite needs no environment', () => {
		const config = generateDrizzleConfig({
			databaseDirectory: 'db',
			databaseEngine: 'sqlite',
			databaseHost: 'none'
		});
		expect(config).not.toContain('DATABASE_URL');
		expect(config).toContain("url: 'db/database.sqlite'");
	});

	test('Turso uses the turso dialect with an auth token', () => {
		const config = generateDrizzleConfig({
			databaseDirectory: 'db',
			databaseEngine: 'sqlite',
			databaseHost: 'turso'
		});
		expect(config).toContain("dialect: 'turso'");
		expect(config).toContain('authToken: env.DATABASE_AUTH_TOKEN');
	});

	test('the Turso runtime client passes the auth token', () => {
		expect(
			generateDBBlock({
				databaseEngine: 'sqlite',
				databaseHost: 'turso',
				orm: 'drizzle'
			})
		).toContain('authToken: env.DATABASE_AUTH_TOKEN');
	});

	test('CockroachDB runs on drizzle-orm/cockroach tables', () => {
		const schema = generateDrizzleSchema({
			authOption: 'none',
			databaseEngine: 'cockroachdb'
		});
		expect(schema).toContain("from 'drizzle-orm/cockroach-core'");
		expect(schema).toContain("cockroachTable('count_history'");
		expect(
			generateDBBlock({
				databaseEngine: 'cockroachdb',
				databaseHost: 'none',
				orm: 'drizzle'
			})
		).toContain('new Pool({ connectionString: getEnv("DATABASE_URL") })');
	});
});

describe('committed initial migrations', () => {
	const migrations = join(import.meta.dir, '../src/templates/db/migrations');
	const targets = [
		...availableDrizzleDialects.map(
			(databaseEngine) => [databaseEngine, 'none'] as const
		),
		['sqlite', 'turso'] as const
	];

	const templateNames = targets.flatMap(([databaseEngine, databaseHost]) =>
		[false, true].map((usesAuth) =>
			getMigrationTemplateName(
				getDrizzleKitDialect(databaseEngine, databaseHost),
				usesAuth
			)
		)
	);

	test('exist for every dialect and example table', () => {
		for (const name of templateNames) {
			const directory = join(migrations, name);
			const [initial] = readdirSync(directory);
			expect(initial).toMatch(/^\d{14}_init$/);
			expect(
				existsSync(join(directory, `${initial}/migration.sql`))
			).toBe(true);
			expect(
				existsSync(join(directory, `${initial}/snapshot.json`))
			).toBe(true);
		}
	});
});
