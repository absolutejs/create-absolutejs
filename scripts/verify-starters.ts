import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffold } from '../src/scaffold';
import type { CreateConfiguration } from '../src/types';

const root =
	process.env.SCAFFOLD_CHECK_ROOT ??
	mkdtempSync(join(tmpdir(), 'absolute-starters-'));
console.log(`Starter checks: ${root}`);
process.chdir(root);
const base: CreateConfiguration = {
	agentic: false,
	absProviders: undefined,
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
	projectName: 'starter',
	tailwind: undefined,
	useHTMLScripts: false,
	useTailwind: false
};
const cases: Array<{ name: string; options: Partial<CreateConfiguration> }> = [
	{ name: 'react', options: {} },
	{ name: 'sqlite', options: { databaseEngine: 'sqlite' } },
	{
		name: 'sqlite-drizzle',
		options: { databaseEngine: 'sqlite', orm: 'drizzle' }
	},
	{
		name: 'sqlite-auth',
		options: {
			databaseEngine: 'sqlite',
			orm: 'drizzle',
			authOption: 'abs',
			absProviders: ['google']
		}
	},
	{
		name: 'neon',
		options: {
			databaseEngine: 'postgresql',
			databaseHost: 'neon',
			orm: 'drizzle'
		}
	},
	{
		name: 'neon-auth',
		options: {
			databaseEngine: 'postgresql',
			databaseHost: 'neon',
			orm: 'drizzle',
			authOption: 'abs',
			absProviders: ['google']
		}
	},
	{
		name: 'turso',
		options: {
			databaseEngine: 'sqlite',
			databaseHost: 'turso',
			orm: 'drizzle'
		}
	},
	{
		name: 'planetscale',
		options: {
			databaseEngine: 'mysql',
			databaseHost: 'planetscale',
			orm: 'drizzle'
		}
	},
	{
		name: 'postgres',
		options: { databaseEngine: 'postgresql', orm: 'drizzle' }
	},
	{ name: 'mysql', options: { databaseEngine: 'mysql', orm: 'drizzle' } },
	{ name: 'mariadb', options: { databaseEngine: 'mariadb', orm: 'drizzle' } },
	{ name: 'mssql', options: { databaseEngine: 'mssql', orm: 'drizzle' } },
	{
		name: 'singlestore',
		options: { databaseEngine: 'singlestore', orm: 'drizzle' }
	},
	{ name: 'gel', options: { databaseEngine: 'gel', orm: 'none' } },
	{ name: 'mongodb', options: { databaseEngine: 'mongodb' } },
	{
		name: 'all-frontends',
		options: {
			databaseEngine: 'sqlite',
			orm: 'drizzle',
			frontends: ['react', 'svelte', 'vue', 'angular', 'html', 'htmx'],
			frontendDirectories: {
				react: 'react',
				svelte: 'svelte',
				vue: 'vue',
				angular: 'angular',
				html: 'html',
				htmx: 'htmx'
			},
			useHTMLScripts: true,
			plugins: ['@elysia/cors', '@elysia/openapi']
		}
	},
	{ name: 'agentic', options: { agentic: true } }
];
// Exercise generated handlers against a real, isolated SQLite database.
const sqliteRuntime = (auth: boolean, orm: boolean) => `
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
${orm ? "import { drizzle } from 'drizzle-orm/bun-sqlite';" : ''}
const client = new Database(':memory:');
client.run(readFileSync('db/schema.sql', 'utf8'));
const db = ${orm ? 'drizzle({client})' : 'client'};
try {
${auth ? `
const { createUser, getUser } = await import('./src/backend/handlers/userHandlers.ts');
const input = {auth_sub:'google_test_subject', metadata:{name:'Test',nested:{roles:['owner']}}};
await createUser(db, input);
const user = await getUser(db, input.auth_sub);
assert.equal(user.auth_sub, input.auth_sub);
assert.deepEqual(user.metadata, input.metadata);
assert.ok(user.created_at instanceof Date);
assert.ok(Math.abs(user.created_at.getTime() - Date.now()) < 5000);
assert.equal(await getUser(db, 'missing'), undefined);
` : `
const { createApi } = await import('./src/backend/api.ts');
const api = createApi(db);
const post = await api.handle(new Request('http://localhost/count',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:7})}));
assert.equal(post.status, 200);
const created = await post.json();
assert.equal(created.count, 7);
assert.ok(Math.abs(new Date(created.created_at).getTime() - Date.now()) < 5000);
const get = await api.handle(new Request('http://localhost/count/'+created.uid));
assert.equal(get.status, 200);
assert.deepEqual(await get.json(), created);
const invalid = await api.handle(new Request('http://localhost/count',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:'invalid'})}));
assert.equal(invalid.status, 422);
assert.equal(client.query('SELECT count(*) AS count FROM count_history').get().count, 1);
`}
} finally { client.close(); }
console.log('Real SQLite persistence and route validation passed');
`;
let failures = 0;
for (const item of cases) {
	if (
		process.env.SCAFFOLD_CHECK_CASES &&
		!process.env.SCAFFOLD_CHECK_CASES.split(',').includes(item.name)
	)
		continue;
	const cwd = join(root, item.name);
	try {
		await scaffold({
			response: { ...base, ...item.options, projectName: item.name },
			packageManager: 'bun',
			latest: false,
			envVariables: undefined,
			verifyLocalDatabase: false
		});
		for (const [stage, argv] of [
			['install', ['bun', 'install']],
			['types', ['bun', 'run', 'tsc', '--noEmit']],
			['lint', ['bun', 'run', 'lint']],
			...(item.options.databaseEngine === 'sqlite' && !item.options.databaseHost ? [['runtime', ['bun', '-e', sqliteRuntime(item.options.authOption === 'abs', item.options.orm === 'drizzle')]]] satisfies Array<[string, string[]]> : [])
		] satisfies Array<[string, string[]]>) {
			const proc = Bun.spawn(argv, {
				cwd,
				stdout: 'pipe',
				stderr: 'pipe'
			});
			const [output, error, exit] = await Promise.all([
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
				proc.exited
			]);
			writeFileSync(
				join(root, `${item.name}-${stage}.log`),
				output + error
			);
			console.log(`${item.name} ${stage}: ${exit}`);
			if (exit !== 0) failures++;
		}
	} catch (error) {
		failures++;
		writeFileSync(join(root, `${item.name}-generation.log`), String(error));
		console.log(`${item.name} generation failed`);
	}
}
console.log(`Failed checks: ${failures}`);
process.exitCode = failures ? 1 : 0;
