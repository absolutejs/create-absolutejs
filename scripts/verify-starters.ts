import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/* Where a Drizzle case's database lives while it is verified:
   - docker: the project's own generated db/docker-compose.db.yml, with its
     fixed host port swapped for an ephemeral one. Its healthcheck is the
     readiness gate.
   - libsql-server: a real libSQL server (sqld) behind JWT auth, to prove the
     Turso path's URL + auth token end to end.
   - file: a local SQLite / libSQL file, as generated. */
type DatabaseTarget = 'docker' | 'file' | 'libsql-server';
type StarterCase = {
	name: string;
	options: Partial<CreateConfiguration>;
	database?: DatabaseTarget;
};

const drizzleAuth = {
	absProviders: ['google'],
	authOption: 'abs',
	orm: 'drizzle'
} satisfies Partial<CreateConfiguration>;

const cases: StarterCase[] = [
	{ name: 'react', options: {} },
	{ name: 'react-bare', options: { includeExamples: false, useTailwind: true, tailwind: { input: 'src/styles/tailwind.css', output: 'build/tailwind.css' } } },
	{ name: 'planetscale-postgres', options: { databaseEngine: 'postgresql', databaseHost: 'planetscale', orm: 'drizzle' } },
	{ name: 'sqlite', options: { databaseEngine: 'sqlite' } },
	{ database: 'file', name: 'sqlite-drizzle', options: { databaseEngine: 'sqlite', orm: 'drizzle' } },
	{ database: 'file', name: 'sqlite-auth', options: { ...drizzleAuth, databaseEngine: 'sqlite' } },
	{ name: 'neon', options: { databaseEngine: 'postgresql', databaseHost: 'neon', orm: 'drizzle' } },
	{ name: 'neon-auth', options: { ...drizzleAuth, databaseEngine: 'postgresql', databaseHost: 'neon' } },
	{ database: 'file', name: 'turso', options: { databaseEngine: 'sqlite', databaseHost: 'turso', orm: 'drizzle' } },
	{ database: 'libsql-server', name: 'turso-server', options: { databaseEngine: 'sqlite', databaseHost: 'turso', orm: 'drizzle' } },
	{ database: 'libsql-server', name: 'turso-server-auth', options: { ...drizzleAuth, databaseEngine: 'sqlite', databaseHost: 'turso' } },
	{ name: 'planetscale', options: { databaseEngine: 'mysql', databaseHost: 'planetscale', orm: 'drizzle' } },
	{ database: 'docker', name: 'postgres', options: { databaseEngine: 'postgresql', orm: 'drizzle' } },
	{ database: 'docker', name: 'postgres-auth', options: { ...drizzleAuth, databaseEngine: 'postgresql' } },
	{ database: 'docker', name: 'mysql', options: { databaseEngine: 'mysql', orm: 'drizzle' } },
	{ database: 'docker', name: 'mysql-auth', options: { ...drizzleAuth, databaseEngine: 'mysql' } },
	{ database: 'docker', name: 'mariadb', options: { databaseEngine: 'mariadb', orm: 'drizzle' } },
	{ database: 'docker', name: 'mariadb-auth', options: { ...drizzleAuth, databaseEngine: 'mariadb' } },
	{ database: 'docker', name: 'mssql', options: { databaseEngine: 'mssql', orm: 'drizzle' } },
	{ database: 'docker', name: 'mssql-auth', options: { ...drizzleAuth, databaseEngine: 'mssql' } },
	{ database: 'docker', name: 'singlestore', options: { databaseEngine: 'singlestore', orm: 'drizzle' } },
	{ database: 'docker', name: 'singlestore-auth', options: { ...drizzleAuth, databaseEngine: 'singlestore' } },
	{ database: 'docker', name: 'cockroachdb', options: { databaseEngine: 'cockroachdb', orm: 'drizzle' } },
	{ database: 'docker', name: 'cockroachdb-auth', options: { ...drizzleAuth, databaseEngine: 'cockroachdb' } },
	{ name: 'gel', options: { databaseEngine: 'gel', orm: 'none' } },
	{ name: 'mongodb', options: { databaseEngine: 'mongodb' } },
	{
		database: 'file',
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

// Exercise raw-SQL (no ORM) handlers against a real, isolated SQLite database.
const sqliteRuntime = `
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const client = new Database(':memory:');
client.run(readFileSync('db/schema.sql', 'utf8'));
try {
const { createApi } = await import('./src/backend/api.ts');
const api = createApi(client);
const post = await api.handle(new Request('http://localhost/count',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:7})}));
assert.equal(post.status, 200);
const created = await post.json();
assert.equal(created.count, 7);
const get = await api.handle(new Request('http://localhost/count/'+created.uid));
assert.equal(get.status, 200);
assert.deepEqual(await get.json(), created);
assert.equal(client.query('SELECT count(*) AS count FROM count_history').get().count, 1);
} finally { client.close(); }
console.log('Real SQLite persistence and route validation passed');
`;

/* The drizzle client each dialect's server builds, reconstructed for the
   user-handler check (the auth example has no unauthenticated HTTP route).
   The count cases go through the generated server itself instead. */
const drizzleClients: Record<string, { imports: string; db: string }> = {
	cockroachdb: {
		db: 'drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }) })',
		imports: "import { drizzle } from 'drizzle-orm/cockroach'; import { Pool } from 'pg';"
	},
	mariadb: {
		db: 'drizzle({ client: createPool(process.env.DATABASE_URL) })',
		imports: "import { drizzle } from 'drizzle-orm/mysql2'; import { createPool } from 'mysql2';"
	},
	mssql: {
		db: 'drizzle({ client: await connect(process.env.DATABASE_URL) })',
		imports: "import { drizzle } from 'drizzle-orm/node-mssql'; import { connect } from 'mssql';"
	},
	mysql: {
		db: 'drizzle({ client: createPool(process.env.DATABASE_URL) })',
		imports: "import { drizzle } from 'drizzle-orm/mysql2'; import { createPool } from 'mysql2';"
	},
	postgresql: {
		db: 'drizzle({ client: new SQL(process.env.DATABASE_URL) })',
		imports: "import { drizzle } from 'drizzle-orm/bun-sql'; import { SQL } from 'bun';"
	},
	singlestore: {
		db: 'drizzle({ client: createPool(process.env.DATABASE_URL) })',
		imports: "import { drizzle } from 'drizzle-orm/singlestore'; import { createPool } from 'mysql2/promise';"
	},
	sqlite: {
		db: "drizzle({ client: new Database('db/database.sqlite') })",
		imports: "import { drizzle } from 'drizzle-orm/bun-sqlite'; import { Database } from 'bun:sqlite';"
	},
	turso: {
		db: 'drizzle({ client: createClient({ authToken: process.env.DATABASE_AUTH_TOKEN, url: process.env.DATABASE_URL }) })',
		imports: "import { drizzle } from 'drizzle-orm/libsql'; import { createClient } from '@libsql/client';"
	}
};

const drizzleUserRuntime = (client: { imports: string; db: string }) => `
${client.imports}
import { strict as assert } from 'node:assert';
const db = ${client.db};
const { createUser, getUser } = await import('./src/backend/handlers/userHandlers.ts');
const input = { auth_sub: 'google_test_subject', metadata: { name: 'Test', nested: { roles: ['owner'] } } };
const created = await createUser(db, input);
assert.equal(created.auth_sub, input.auth_sub);
const user = await getUser(db, input.auth_sub);
assert.ok(user, 'the created user reads back');
assert.equal(user.auth_sub, input.auth_sub);
assert.deepEqual(user.metadata, input.metadata);
assert.ok(user.created_at instanceof Date);
const skew = Math.abs(user.created_at.getTime() - Date.now());
assert.ok(skew < 60000, 'created_at is ' + skew + 'ms from now');
assert.equal(await getUser(db, 'missing'), undefined);
console.log('Users persisted and read back through the generated handlers');
process.exit(0);
`;

let failures = 0;
const results: string[] = [];

const run = async (
	item: StarterCase,
	stage: string,
	argv: string[],
	env: Record<string, string> = {}
) => {
	const proc = Bun.spawn(argv, {
		cwd: join(root, item.name),
		env: { ...process.env, ...env },
		stderr: 'pipe',
		stdout: 'pipe'
	});
	const [output, error, exit] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);
	writeFileSync(join(root, `${item.name}-${stage}.log`), output + error);

	return { exit, output: output + error };
};

const record = (item: StarterCase, stage: string, passed: boolean) => {
	console.log(`${item.name} ${stage}: ${passed ? 0 : 1}`);
	results.push(`${item.name} ${stage} ${passed ? 'ok' : 'FAILED'}`);
	if (!passed) failures++;

	return passed;
};

const sleep = (milliseconds: number) => Bun.sleep(milliseconds);
const shell = async (argv: string[], cwd = root) => {
	const proc = Bun.spawn(argv, { cwd, stderr: 'pipe', stdout: 'pipe' });
	const [output, error, exit] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);

	return { exit, output: output.trim(), error };
};

const containerAddress = async (container: string) =>
	(
		await shell([
			'docker',
			'inspect',
			'-f',
			'{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
			container
		])
	).output;

/* Reads a KEY=value line from the generated .env (the URL the project
   ships with) so only its host is changed for verification. */
const envValue = (item: StarterCase, key: string) =>
	readFileSync(join(root, item.name, '.env'), 'utf8')
		.split('\n')
		.find((line) => line.startsWith(`${key}=`))
		?.slice(key.length + 1);

type Database = { env: Record<string, string>; stop: () => Promise<unknown> };

/* The generated compose file maps a fixed host port ("5432:5432"), which can
   collide with anything else on the machine. The override swaps it for an
   ephemeral loopback port, and the generated DATABASE_URL is kept verbatim
   except for that port — so the URL format, credentials and database name the
   project ships with are what gets exercised. */
const startDockerDatabase = async (item: StarterCase): Promise<Database> => {
	const cwd = join(root, item.name);
	const composeFile = readFileSync(join(cwd, 'db/docker-compose.db.yml'), 'utf8');
	const [, containerPort] = composeFile.match(/- "\d+:(\d+)"/) ?? [];
	if (!containerPort) throw new Error('the compose file maps no port');
	const override = join(root, `${item.name}-compose.verify.yml`);
	writeFileSync(
		override,
		`services:
    db:
        ports: !override
            - "127.0.0.1::${containerPort}"
        restart: "no"
`
	);
	const compose = [
		'docker',
		'compose',
		'-p',
		`cabs-verify-${item.name}`,
		'-f',
		'db/docker-compose.db.yml',
		'-f',
		override
	];
	const stop = () => shell([...compose, 'down', '-v'], cwd);
	const up = await run(item, 'db-up', [...compose, 'up', '-d', '--wait', 'db']);
	if (up.exit !== 0) {
		await stop();
		throw new Error('database container did not become healthy');
	}
	const published = (await shell([...compose, 'port', 'db', containerPort], cwd)).output;
	const hostPort = published.split(':').pop();
	const url = envValue(item, 'DATABASE_URL');
	if (!url || !hostPort) {
		await stop();
		throw new Error(`no DATABASE_URL or published port (${published})`);
	}
	const localUrl = url.replace(
		new RegExp(`localhost([:,])${containerPort}`),
		`localhost$1${hostPort}`
	);
	if (localUrl === url) {
		await stop();
		throw new Error(`DATABASE_URL does not target localhost:${containerPort}`);
	}

	return { env: { DATABASE_URL: localUrl }, stop };
};

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
	Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url');

/* sqld verifies Ed25519-signed JWTs against SQLD_AUTH_JWT_KEY, exactly like a
   Turso database token; requests without the token are rejected. */
const startLibsqlServer = async (item: StarterCase): Promise<Database> => {
	const keys = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	const publicKey = base64url(await crypto.subtle.exportKey('raw', keys.publicKey));
	const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
	const claims = base64url(new TextEncoder().encode(JSON.stringify({ a: 'rw' })));
	const signature = base64url(
		await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(`${header}.${claims}`))
	);
	const container = `cabs-verify-${item.name}`;
	await shell(['docker', 'rm', '-f', container]);
	const started = await shell([
		'docker', 'run', '-d', '--rm', '--name', container,
		'-e', `SQLD_AUTH_JWT_KEY=${publicKey}`,
		'ghcr.io/tursodatabase/libsql-server:latest'
	]);
	if (started.exit !== 0) throw new Error(started.error);
	const stop = () => shell(['docker', 'rm', '-f', container]);
	const url = `http://${await containerAddress(container)}:8080`;
	for (let attempt = 0; attempt < 60; attempt++) {
		const health = await fetch(`${url}/health`).catch(() => undefined);
		if (health?.ok) break;
		await sleep(500);
	}
	const anonymous = await fetch(`${url}/v2/pipeline`, {
		body: JSON.stringify({ requests: [{ stmt: { sql: 'SELECT 1' }, type: 'execute' }] }),
		method: 'POST'
	});
	if (anonymous.status !== 401) {
		await stop();
		throw new Error(`libsql-server accepted a request without a token (${anonymous.status})`);
	}

	return {
		env: { DATABASE_AUTH_TOKEN: `${header}.${claims}.${signature}`, DATABASE_URL: url },
		stop
	};
};

const startDatabase = (item: StarterCase): Promise<Database> => {
	if (item.database === 'docker') return startDockerDatabase(item);
	if (item.database === 'libsql-server') return startLibsqlServer(item);

	return Promise.resolve({ env: {}, stop: () => Promise.resolve() });
};

/* Points the project's .env at the verification database. The dev server
   loads .env itself, so the file (not just the process env) must carry it. */
const applyEnv = (item: StarterCase, env: Record<string, string>) => {
	const path = join(root, item.name, '.env');
	const lines = readFileSync(path, 'utf8')
		.split('\n')
		.filter((line) => !Object.keys(env).some((key) => line.startsWith(`${key}=`)));
	writeFileSync(path, [...lines, ...Object.entries(env).map(([key, value]) => `${key}=${value}`)].join('\n'));
};

/* `absolute dev` runs the project's db:up/db:down scripts when a compose file
   exists — with the host port mappings and a shared compose project name. The
   harness already runs that compose file port-less, so for the server stage
   those hooks are switched off and restored afterwards. */
const withoutDatabaseHooks = async <T>(item: StarterCase, task: () => Promise<T>) => {
	const path = join(root, item.name, 'package.json');
	const original = readFileSync(path, 'utf8');
	const manifest = JSON.parse(original) as { scripts: Record<string, string> };
	delete manifest.scripts['db:up'];
	delete manifest.scripts['db:down'];
	writeFileSync(path, JSON.stringify(manifest, null, 2));
	try {
		return await task();
	} finally {
		writeFileSync(path, original);
	}
};

/* Boots the generated server (`bun run dev`) against the database and drives
   the example count API over real HTTP. */
const verifyServer = async (item: StarterCase, env: Record<string, string>) => {
	const port = String(41000 + cases.indexOf(item));
	const log = join(root, `${item.name}-server.log`);
	const server = Bun.spawn(['setsid', 'bun', 'run', 'dev'], {
		cwd: join(root, item.name),
		env: { ...process.env, ...env, ABSOLUTE_PORT: port, PORT: port },
		stderr: Bun.file(log),
		stdout: Bun.file(`${log}.out`)
	});
	const origin = `http://127.0.0.1:${port}`;
	try {
		let ready = false;
		for (let attempt = 0; attempt < 180 && !ready; attempt++) {
			ready = (await fetch(`${origin}/`).catch(() => undefined))?.ok === true;
			if (!ready) await sleep(500);
		}
		if (!ready) throw new Error('server never answered');
		const post = await fetch(`${origin}/count`, {
			body: JSON.stringify({ count: 7 }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});
		const created = (await post.json()) as { uid: number; count: number; created_at: string };
		if (post.status !== 200) throw new Error(`POST /count ${post.status}: ${JSON.stringify(created)}`);
		if (created.count !== 7) throw new Error(`POST /count returned ${JSON.stringify(created)}`);
		const skew = Math.abs(new Date(created.created_at).getTime() - Date.now());
		if (!(skew < 60000)) throw new Error(`created_at ${created.created_at} is ${skew}ms from now`);
		const get = await fetch(`${origin}/count/${created.uid}`);
		const read = await get.json();
		if (get.status !== 200 || JSON.stringify(read) !== JSON.stringify(created))
			throw new Error(`GET /count/${created.uid} ${get.status}: ${JSON.stringify(read)}`);
		const invalid = await fetch(`${origin}/count`, {
			body: JSON.stringify({ count: 'invalid' }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});
		if (invalid.status !== 422) throw new Error(`invalid body answered ${invalid.status}`);
		writeFileSync(`${log}.result`, `created ${JSON.stringify(created)}\nread ${JSON.stringify(read)}\n`);

		return true;
	} catch (error) {
		writeFileSync(`${log}.result`, String(error));
		console.log(`${item.name} server: ${String(error)}`);

		return false;
	} finally {
		try {
			process.kill(-server.pid, 'SIGKILL');
		} catch {
			server.kill('SIGKILL');
		}
		await server.exited;
	}
};

const verifyDrizzle = async (item: StarterCase) => {
	let database: Database | undefined;
	try {
		database = await startDatabase(item);
	} catch (error) {
		writeFileSync(join(root, `${item.name}-database.log`), String(error));
		record(item, 'database', false);

		return;
	}
	try {
		if (Object.keys(database.env).length > 0) applyEnv(item, database.env);
		const migrations = join(root, item.name, 'db/migrations');
		const committed = readdirSync(migrations).length;
		const generate = await run(item, 'db-generate', ['bun', 'run', 'db:generate'], database.env);
		const inSync =
			generate.exit === 0 &&
			generate.output.includes('No schema changes') &&
			readdirSync(migrations).length === committed;
		if (!record(item, 'db:generate (no drift)', inSync)) return;
		const migrate = await run(item, 'db-migrate', ['bun', 'run', 'db:migrate'], database.env);
		if (!record(item, 'db:migrate', migrate.exit === 0)) return;
		const again = await run(item, 'db-migrate-again', ['bun', 'run', 'db:migrate'], database.env);
		if (!record(item, 'db:migrate (idempotent)', again.exit === 0)) return;
		if (item.options.authOption === 'abs') {
			const dialect = item.options.databaseHost === 'turso' ? 'turso' : String(item.options.databaseEngine);
			const client = drizzleClients[dialect];
			if (!client) throw new Error(`no client for ${dialect}`);
			const handlers = await run(item, 'handlers', ['bun', '-e', drizzleUserRuntime(client)], database.env);
			record(item, 'query (user handlers)', handlers.exit === 0);

			return;
		}
		const env = database.env;
		record(
			item,
			'query (HTTP via dev server)',
			await withoutDatabaseHooks(item, () => verifyServer(item, env))
		);
	} finally {
		await database.stop();
	}
};

for (const item of cases) {
	if (
		process.env.SCAFFOLD_CHECK_CASES &&
		!process.env.SCAFFOLD_CHECK_CASES.split(',').includes(item.name)
	)
		continue;
	try {
		await scaffold({
			response: { ...base, ...item.options, projectName: item.name },
			packageManager: 'bun',
			latest: false,
			envVariables: undefined,
			verifyLocalDatabase: false
		});
	} catch (error) {
		failures++;
		results.push(`${item.name} generation FAILED`);
		writeFileSync(join(root, `${item.name}-generation.log`), String(error));
		console.log(`${item.name} generation failed`);
		continue;
	}
	let built = true;
	for (const [stage, argv] of [
		['install', ['bun', 'install']],
		['types', ['bun', 'run', 'tsc', '--noEmit']],
		['lint', ['bun', 'run', 'lint']]
	] satisfies Array<[string, string[]]>) {
		const { exit } = await run(item, stage, argv);
		built = record(item, stage, exit === 0) && built;
	}
	if (!built) continue;
	if (item.options.databaseEngine === 'sqlite' && item.options.orm !== 'drizzle') {
		const { exit } = await run(item, 'runtime', ['bun', '-e', sqliteRuntime]);
		record(item, 'runtime', exit === 0);
	}
	if (item.database) await verifyDrizzle(item);
}

writeFileSync(join(root, 'results.txt'), `${results.join('\n')}\n`);
console.log(`Failed checks: ${failures}`);
process.exitCode = failures ? 1 : 0;
