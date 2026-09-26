/* Regenerates the initial Drizzle migration every scaffolded project ships
   with (src/templates/db/migrations/<kit dialect>-<table>/). Each one is the
   real `drizzle-kit generate` output for the schema generateDrizzleSchema
   emits, so a fresh project's `db:migrate` creates the example table and its
   `db:generate` reports no drift. Run after changing the schema generator or
   bumping drizzle-kit: `bun scripts/generate-drizzle-migrations.ts`. */
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { generateDrizzleConfig } from '../src/generators/configurations/generateDrizzleConfig';
import {
	getDrizzleKitDialect,
	getMigrationTemplateName
} from '../src/generators/db/drizzleTargets';
import { generateDrizzleSchema } from '../src/generators/db/generateDrizzleSchema';
import type { AvailableDrizzleDialect, DatabaseHost } from '../src/types';

const repository = resolve(import.meta.dir, '..');
const templates = join(repository, 'src/templates/db/migrations');
const scratch = join(repository, '.absolutejs/drizzle-migrations');

/* One representative engine per kit dialect: mariadb shares mysql's output,
   and turso is sqlite-core tables under the turso kit dialect. */
const targets: Array<[AvailableDrizzleDialect, DatabaseHost]> = [
	['cockroachdb', 'none'],
	['mssql', 'none'],
	['mysql', 'none'],
	['postgresql', 'none'],
	['singlestore', 'none'],
	['sqlite', 'none'],
	['sqlite', 'turso']
];

rmSync(scratch, { force: true, recursive: true });

/* The SQL of the single initial migration in a migrations directory. */
const initialSql = (directory: string) => {
	if (!existsSync(directory)) return undefined;
	const [initial] = readdirSync(directory);

	return initial
		? readFileSync(join(directory, initial, 'migration.sql'), 'utf8')
		: undefined;
};

for (const [databaseEngine, databaseHost] of targets) {
	for (const usesAuth of [false, true]) {
		const name = getMigrationTemplateName(
			getDrizzleKitDialect(databaseEngine, databaseHost),
			usesAuth
		);
		const project = join(scratch, name);
		mkdirSync(join(project, 'db'), { recursive: true });
		writeFileSync(
			join(project, 'db/schema.ts'),
			generateDrizzleSchema({
				authOption: usesAuth ? 'abs' : 'none',
				databaseEngine
			})
		);
		writeFileSync(
			join(project, 'drizzle.config.ts'),
			generateDrizzleConfig({
				databaseDirectory: 'db',
				databaseEngine,
				databaseHost
			})
		);
		const generate = Bun.spawnSync(
			['bun', '--bun', 'drizzle-kit', 'generate', '--name', 'init'],
			{
				cwd: project,
				env: { ...process.env, DATABASE_URL: 'file:unused.db' },
				stderr: 'inherit',
				stdout: 'inherit'
			}
		);
		if (generate.exitCode !== 0)
			throw new Error(`drizzle-kit generate failed for ${name}`);
		/* Keep an unchanged template byte-for-byte (its timestamped folder and
		   snapshot id) so regenerating only diffs what actually changed. */
		const generated = join(project, 'db/migrations');
		const template = join(templates, name);
		if (initialSql(generated) === initialSql(template)) {
			console.log(`Unchanged ${name}`);
			continue;
		}
		rmSync(template, { force: true, recursive: true });
		cpSync(generated, template, { recursive: true });
		console.log(`Wrote ${name}`);
	}
}

rmSync(scratch, { force: true, recursive: true });
