import type { PrismaTarget } from './prismaTargets';

type GeneratePrismaConfigProps = {
	databaseDirectory: string;
	target: PrismaTarget;
};

/* Prisma reads no .env file on its own once a prisma.config.ts exists, and its
   CLI may run under Node, so the config loads the project's .env itself (never
   overriding variables already set in the environment). */
const loadEnv = `/* Prisma does not load .env by itself; variables already set win. */
if (existsSync('.env')) process.loadEnvFile('.env');
`;

/* Applies the committed Prisma migrations to a libSQL/Turso database, in
   order, once each, recording them in their own table. */
export const generateLibsqlMigrateScript =
	() => `import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { env } from 'bun';

const url = env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set in the environment variables');

const client = createClient({ authToken: env.DATABASE_AUTH_TOKEN, url });
const migrationsDirectory = join(import.meta.dir, 'migrations');

await client.execute(
	'CREATE TABLE IF NOT EXISTS "_libsql_migrations" ("name" TEXT PRIMARY KEY, "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)'
);
const { rows } = await client.execute('SELECT "name" FROM "_libsql_migrations"');
const applied = new Set(rows.map((row) => String(row.name)));
const pending = readdirSync(migrationsDirectory, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !applied.has(entry.name))
	.map((entry) => entry.name)
	.sort();

for (const name of pending) {
	const sql = readFileSync(join(migrationsDirectory, name, 'migration.sql'), 'utf8');
	await client.executeMultiple(sql);
	await client.execute({ args: [name], sql: 'INSERT INTO "_libsql_migrations" ("name") VALUES (?)' });
	console.log(\`Applied \${name}\`);
}

console.log(pending.length ? \`\${pending.length} migration(s) applied\` : 'No pending migrations');
client.close();
`;
export const generatePrismaConfig = ({
	databaseDirectory,
	target
}: GeneratePrismaConfigProps) => {
	const schema = `schema: '${databaseDirectory}/schema.prisma'`;

	if (target.line === 'prisma6') {
		return `import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

${loadEnv}
export default defineConfig({
	${schema}
});
`;
	}

	/* Prisma Migrate cannot reach libSQL/Turso URLs. \`db:migrate:dev\` authors
	   new migrations against a scratch SQLite file instead, and \`db:migrate\`
	   applies them to DATABASE_URL through ${databaseDirectory}/migrate.ts. */
	const url =
		target.migration === 'libsql'
			? `'file:./${databaseDirectory}/prisma-migrate-dev.db'`
			: "process.env.DATABASE_URL ?? ''";

	return `import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

${loadEnv}
export default defineConfig({
	datasource: { url: ${url} },
	migrations: { path: '${databaseDirectory}/migrations' },
	${schema}
});
`;
};
