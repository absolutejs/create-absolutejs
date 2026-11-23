import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync
} from 'fs';
import { tmpdir } from 'os';
import { join, sep } from 'path';
import { cwd, chdir } from 'process';
import { describe, expect, test } from 'bun:test';
import {
	prismaMigrationEngines,
	renderInitialMigration
} from '../scripts/generate-prisma-migrations';
import { availablePrismaDialects } from '../src/data';
import {
	generatePrismaDatabaseTypes,
	generatePrismaHandlers,
	getPrismaServerImports
} from '../src/generators/prisma/generatePrismaCode';
import { generatePrismaConfig } from '../src/generators/prisma/generatePrismaConfig';
import { generatePrismaSchema } from '../src/generators/prisma/generatePrismaSchema';
import { getPrismaPackageJson } from '../src/generators/prisma/prismaPackageJson';
import {
	getPrismaTarget,
	initialPrismaMigrationName
} from '../src/generators/prisma/prismaTargets';
import { getPrismaLocalDatabaseUrl } from '../src/generators/prisma/scaffoldPrismaDatabase';
import { generateDBBlock } from '../src/generators/project/generateDBBlock';
import { scaffold } from '../src/scaffold';
import type { CreateConfiguration } from '../src/types';
import { validateDatabaseSelection } from '../src/utils/validateDatabaseSelection';
import { prismaMongoDBVersion, versions } from '../src/versions';

const templates = join(import.meta.dir, '../src/templates/db/migrations');

describe('Prisma database selection', () => {
	test('every Prisma database is accepted locally', () => {
		for (const databaseEngine of availablePrismaDialects) {
			expect(
				validateDatabaseSelection({
					databaseEngine,
					databaseHost: 'none',
					orm: 'prisma'
				}).errors
			).toEqual([]);
		}
	});

	test('every hosted combination the CLI accepts is a Prisma target', () => {
		for (const [databaseEngine, databaseHost] of [
			['postgresql', 'neon'],
			['postgresql', 'planetscale'],
			['mysql', 'planetscale'],
			['sqlite', 'turso']
		] as const) {
			expect(
				validateDatabaseSelection({
					databaseEngine,
					databaseHost,
					orm: 'prisma'
				}).errors
			).toEqual([]);
		}
	});

	test('Gel and SingleStore are refused for Prisma with a clear message', () => {
		for (const databaseEngine of ['gel', 'singlestore'] as const) {
			const [error] = validateDatabaseSelection({
				databaseEngine,
				databaseHost: 'none',
				orm: 'prisma'
			}).errors;
			expect(error).toContain(
				`Invalid database engine for Prisma ORM: "${databaseEngine}"`
			);
			expect(error).toContain('--orm none');
		}
	});
});

describe('Prisma targets', () => {
	test('each engine and host gets its provider and driver adapter', () => {
		const expected = [
			['postgresql', 'none', 'postgresql', '@prisma/adapter-pg'],
			['postgresql', 'neon', 'postgresql', '@prisma/adapter-neon'],
			['postgresql', 'planetscale', 'postgresql', '@prisma/adapter-pg'],
			['cockroachdb', 'none', 'cockroachdb', '@prisma/adapter-pg'],
			['mysql', 'none', 'mysql', '@prisma/adapter-mariadb'],
			['mysql', 'planetscale', 'mysql', '@prisma/adapter-planetscale'],
			['mariadb', 'none', 'mysql', '@prisma/adapter-mariadb'],
			['mssql', 'none', 'sqlserver', '@prisma/adapter-mssql'],
			['sqlite', 'none', 'sqlite', '@prisma/adapter-libsql'],
			['sqlite', 'turso', 'sqlite', '@prisma/adapter-libsql']
		] as const;
		for (const [engine, host, provider, adapter] of expected) {
			const target = getPrismaTarget(engine, host);
			expect(target.provider).toBe(provider);
			expect(target.adapter?.packageName).toBe(adapter);
			expect(target.line).toBe('prisma7');
		}
	});

	test('MongoDB uses the Prisma 6 engine without an adapter', () => {
		const target = getPrismaTarget('mongodb', 'none');
		expect(target.line).toBe('prisma6');
		expect(target.adapter).toBeUndefined();
		expect(target.migration).toBe('push');
		expect(
			generateDBBlock({
				databaseEngine: 'mongodb',
				databaseHost: 'none',
				orm: 'prisma'
			})
		).toBe(
			"const db = new PrismaClient({ datasourceUrl: getEnv('DATABASE_URL') })"
		);
	});

	test('Turso migrates through libSQL, local SQLite through Prisma Migrate', () => {
		expect(getPrismaTarget('sqlite', 'turso').migration).toBe('libsql');
		expect(getPrismaTarget('sqlite', 'none').migration).toBe('migrate');
	});

	test('the server builds the client with the adapter it imports', () => {
		const target = getPrismaTarget('sqlite', 'turso');
		const imports = getPrismaServerImports(target);
		expect(imports).toContain(
			"import { PrismaLibSql } from '@prisma/adapter-libsql'"
		);
		expect(imports).toContain("import { env } from 'bun'");
		expect(
			generateDBBlock({
				databaseEngine: 'sqlite',
				databaseHost: 'turso',
				orm: 'prisma'
			})
		).toContain('new PrismaLibSql({ authToken: env.DATABASE_AUTH_TOKEN');
	});
});

describe('Prisma schema and config', () => {
	test('the client is generated to a fixed path relative to the schema', () => {
		const target = getPrismaTarget('postgresql', 'none');
		expect(
			generatePrismaSchema({
				authOption: 'none',
				databaseDirectory: 'db',
				target
			})
		).toContain('output   = "../src/generated/prisma"');
		expect(
			generatePrismaSchema({
				authOption: 'none',
				databaseDirectory: 'database/prisma',
				target
			})
		).toContain('output   = "../../src/generated/prisma"');
	});

	test('provider-specific columns', () => {
		const schema = (
			engine: (typeof availablePrismaDialects)[number],
			auth: boolean
		) =>
			generatePrismaSchema({
				authOption: auth ? 'abs' : 'none',
				databaseDirectory: 'db',
				target: getPrismaTarget(engine, 'none')
			});
		expect(schema('cockroachdb', false)).toContain(
			'@default(sequence(maxValue: 2147483647))'
		);
		expect(schema('postgresql', false)).toContain(
			'@default(autoincrement())'
		);
		expect(schema('mssql', true)).toContain(
			'metadata   String   @db.NVarChar(Max)'
		);
		expect(schema('sqlite', true)).toContain('metadata   Json');
		expect(schema('mongodb', false)).toContain('model Counter');
		expect(schema('mongodb', false)).toContain(
			'url      = env("DATABASE_URL")'
		);
		expect(schema('postgresql', false)).not.toContain('url');
	});

	test('prisma.config.ts loads .env and points Migrate at the committed migrations', () => {
		const config = generatePrismaConfig({
			databaseDirectory: 'db',
			target: getPrismaTarget('postgresql', 'none')
		});
		expect(config).toContain("process.loadEnvFile('.env')");
		expect(config).toContain("migrations: { path: 'db/migrations' }");
		expect(config).toContain("url: process.env.DATABASE_URL ?? ''");
		expect(
			generatePrismaConfig({
				databaseDirectory: 'db',
				target: getPrismaTarget('sqlite', 'turso')
			})
		).toContain("url: 'file:./db/prisma-migrate-dev.db'");
	});

	test("local URLs use each engine's Prisma format", () => {
		expect(
			getPrismaLocalDatabaseUrl(
				getPrismaTarget('mssql', 'none'),
				'db',
				'none'
			)
		).toStartWith('sqlserver://localhost:1433;');
		expect(
			getPrismaLocalDatabaseUrl(
				getPrismaTarget('mongodb', 'none'),
				'db',
				'none'
			)
		).toContain('replicaSet=rs0');
		expect(
			getPrismaLocalDatabaseUrl(
				getPrismaTarget('sqlite', 'none'),
				'db',
				'none'
			)
		).toBe('file:./db/database.sqlite');
		expect(
			getPrismaLocalDatabaseUrl(
				getPrismaTarget('mariadb', 'none'),
				'db',
				'none'
			)
		).toStartWith('mysql://');
		expect(
			getPrismaLocalDatabaseUrl(
				getPrismaTarget('postgresql', 'neon'),
				'db',
				'neon'
			)
		).toBeUndefined();
	});
});

describe('Prisma handlers and types', () => {
	test('handlers await every query so routes receive real Promises', () => {
		for (const engine of availablePrismaDialects) {
			const handlers = generatePrismaHandlers(
				'none',
				getPrismaTarget(engine, 'none')
			);
			expect(handlers).toContain('await db.countHistory');
			expect(handlers).not.toMatch(/=>\s*db\./);
		}
	});

	test('SQL Server serializes user metadata; Json providers store it natively', () => {
		expect(
			generatePrismaHandlers('abs', getPrismaTarget('mssql', 'none'))
		).toContain('JSON.stringify(metadata)');
		expect(
			generatePrismaHandlers('abs', getPrismaTarget('postgresql', 'none'))
		).not.toContain('JSON.stringify');
	});

	test('database types come from the generated client', () => {
		expect(
			generatePrismaDatabaseTypes(
				'none',
				getPrismaTarget('mongodb', 'none')
			)
		).toContain(
			"export type CountHistory = Omit<CountHistoryModel, 'id'>;"
		);
		expect(
			generatePrismaDatabaseTypes('abs', getPrismaTarget('mysql', 'none'))
		).toContain('export type DatabaseType = PrismaClient;');
	});
});

describe('Prisma package.json', () => {
	test('versions are pinned, never resolved from the latest tag', () => {
		const { dependencies, devDependencies, scripts } = getPrismaPackageJson(
			getPrismaTarget('postgresql', 'none'),
			'db'
		);
		expect(devDependencies.prisma).toBe(versions.prisma);
		expect(dependencies['@prisma/client']).toBe(versions['@prisma/client']);
		expect(dependencies['@prisma/adapter-pg']).toBe(
			versions['@prisma/adapter-pg']
		);
		expect(scripts.postinstall).toBe('prisma generate');
		expect(scripts['db:generate']).toBe('prisma generate');
		expect(scripts['db:migrate']).toBe('prisma migrate deploy');
	});

	test('MongoDB pins Prisma 6 and syncs with db push', () => {
		const { dependencies, devDependencies, scripts } = getPrismaPackageJson(
			getPrismaTarget('mongodb', 'none'),
			'db'
		);
		expect(devDependencies.prisma).toBe(prismaMongoDBVersion);
		expect(dependencies['@prisma/client']).toBe(prismaMongoDBVersion);
		expect(scripts['db:migrate']).toBe('prisma db push');
	});

	test('Turso applies migrations with the generated libSQL script', () => {
		const { dependencies, scripts } = getPrismaPackageJson(
			getPrismaTarget('sqlite', 'turso'),
			'db'
		);
		expect(scripts['db:migrate']).toBe('bun db/migrate.ts');
		expect(dependencies['@libsql/client']).toBe(versions['@libsql/client']);
	});
});

describe('committed Prisma migrations', () => {
	/* Each committed migration must be exactly what Prisma renders for the
	   schema we generate today, or a fresh project would drift on day one. */
	test('match prisma migrate diff for the generated schemas', () => {
		const variants = prismaMigrationEngines.flatMap((engine) => [
			renderInitialMigration(engine, false),
			renderInitialMigration(engine, true)
		]);
		for (const { lock, name, sql } of variants) {
			const directory = join(templates, name);
			expect(
				readFileSync(
					join(
						directory,
						initialPrismaMigrationName,
						'migration.sql'
					),
					'utf8'
				)
			).toBe(sql);
			expect(
				readFileSync(join(directory, 'migration_lock.toml'), 'utf8')
			).toBe(lock);
		}
	}, 120000);

	test('SQL Server locks as mssql, the name Prisma 7 Migrate records', () => {
		expect(
			readFileSync(
				join(templates, 'prisma-sqlserver-users/migration_lock.toml'),
				'utf8'
			)
		).toContain('provider = "mssql"');
	});
});

const baseConfiguration: CreateConfiguration = {
	absProviders: undefined,
	agentic: false,
	assetsDirectory: 'src/backend/assets',
	authOption: 'none',
	buildDirectory: 'build',
	codeQualityTool: 'eslint+prettier',
	databaseDirectory: 'db',
	databaseEngine: 'none',
	databaseHost: 'none',
	directoryConfig: 'default',
	frontendDirectories: { react: '' },
	frontends: ['react'],
	githubLink: 'skip',
	githubRepoUrl: undefined,
	githubVisibility: undefined,
	includeExamples: true,
	initializeGitNow: false,
	installDependenciesNow: false,
	orm: 'none',
	plugins: [],
	projectName: 'app',
	tailwind: undefined,
	useHTMLScripts: false,
	useTailwind: false
};

describe('scaffolding writes only inside the project directory', () => {
	const temporaryRoot = realpathSync(tmpdir());

	for (const options of [
		{ databaseEngine: 'postgresql', orm: 'prisma' },
		{ databaseEngine: 'sqlite', orm: 'prisma' },
		{ databaseEngine: 'mongodb', orm: 'prisma' },
		{ databaseEngine: 'sqlite', databaseHost: 'turso', orm: 'prisma' },
		{ databaseEngine: 'postgresql', orm: 'drizzle' }
	] satisfies Partial<CreateConfiguration>[]) {
		test(`${options.orm} ${options.databaseEngine} ${options.databaseHost ?? ''}`, async () => {
			const unrelated = realpathSync(
				mkdtempSync(join(tmpdir(), 'scaffold-cwd-'))
			);
			const target = realpathSync(
				mkdtempSync(join(tmpdir(), 'scaffold-target-'))
			);
			expect(unrelated.startsWith(`${temporaryRoot}${sep}`)).toBe(true);
			expect(target.startsWith(`${temporaryRoot}${sep}`)).toBe(true);
			const projectName = join(target, 'app');
			const previous = cwd();
			chdir(unrelated);
			try {
				await scaffold({
					envVariables: undefined,
					latest: false,
					packageManager: 'bun',
					response: { ...baseConfiguration, ...options, projectName },
					verifyLocalDatabase: false
				});
				expect(readdirSync(unrelated)).toEqual([]);
				expect(existsSync(join(projectName, 'package.json'))).toBe(
					true
				);
				const ormFiles =
					options.orm === 'prisma'
						? ['prisma.config.ts', 'db/schema.prisma']
						: ['drizzle.config.ts', 'db/schema.ts'];
				expect(
					ormFiles.filter(
						(file) => !existsSync(join(projectName, file))
					)
				).toEqual([]);
			} finally {
				chdir(previous);
				rmSync(unrelated, { force: true, recursive: true });
				rmSync(target, { force: true, recursive: true });
			}
		});
	}
});
