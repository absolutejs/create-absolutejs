import { writeFileSync } from 'fs';
import { join } from 'path';
import { spinner } from '@clack/prompts';
import { green } from 'picocolors';
import {
	absoluteAuthPlugin,
	availablePlugins,
	defaultDependencies,
	defaultPlugins,
	eslintAndPrettierDependencies,
	eslintReactDependencies
} from '../../data';
import type { CreateConfiguration, PackageJson } from '../../types';
import { getPackageVersions } from '../../utils/getPackageVersion';
import { versions } from '../../versions';
import { computeFlags } from '../project/computeFlags';

type CreatePackageJsonProps = Pick<
	CreateConfiguration,
	| 'authOption'
	| 'useTailwind'
	| 'databaseEngine'
	| 'databaseHost'
	| 'plugins'
	| 'orm'
	| 'frontendDirectories'
	| 'codeQualityTool'
> & {
	projectName: string;
	latest: boolean;
};

const dbClientCommands = {
	cockroachdb: 'cockroach sql --insecure --database=database',
	gel: 'gel -H localhost -P 5656 -u admin --tls-security insecure -b main',
	mariadb: 'MYSQL_PWD=userpassword mariadb -h127.0.0.1 -u user database',
	mongodb:
		'mongosh -u user -p password --authenticationDatabase admin database',
	mssql: '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1',
	mysql: 'MYSQL_PWD=userpassword mysql -h127.0.0.1 -u user database',
	postgresql: 'psql -h localhost -U user -d database',
	singlestore: 'singlestore -u root -ppassword -D database'
} as const;

export const createPackageJson = async ({
	projectName,
	authOption,
	plugins,
	databaseEngine,
	orm,
	databaseHost,
	useTailwind,
	latest,
	frontendDirectories,
	codeQualityTool
}: CreatePackageJsonProps) => {
	const flags = computeFlags(frontendDirectories);
	const isLocal = !databaseHost || databaseHost === 'none';

	/* ── Collect all package names that need versions ─────────── */
	const packageNames = new Set<string>();
	packageNames.add('typescript');

	for (const p of defaultPlugins) packageNames.add(p.value);
	for (const dep of defaultDependencies) packageNames.add(dep.value);

	if (authOption === 'abs') packageNames.add(absoluteAuthPlugin.value);

	for (const pluginValue of plugins) {
		const meta = availablePlugins.find((p) => p.value === pluginValue);
		if (meta) packageNames.add(meta.value);
	}

	if (codeQualityTool === 'eslint+prettier') {
		for (const dep of eslintAndPrettierDependencies)
			packageNames.add(dep.value);
	}

	if (useTailwind) {
		packageNames.add('autoprefixer');
		packageNames.add('postcss');
		packageNames.add('tailwindcss');
		packageNames.add('@tailwindcss/cli');
	}

	if (flags.requiresReact) {
		packageNames.add('react');
		packageNames.add('react-dom');
		packageNames.add('@types/react');
	}

	if (flags.requiresReact && codeQualityTool === 'eslint+prettier') {
		for (const dep of eslintReactDependencies) packageNames.add(dep.value);
	}

	if (flags.requiresSvelte) packageNames.add('svelte');
	if (flags.requiresSvelte && codeQualityTool === 'eslint+prettier')
		packageNames.add('prettier-plugin-svelte');
	if (flags.requiresVue) packageNames.add('vue');
	if (flags.requiresHtmx) packageNames.add('elysia-scoped-state');
	if (orm === 'drizzle') packageNames.add('drizzle-orm');

	switch (databaseHost) {
		case 'neon':
			packageNames.add('@neondatabase/serverless');
			break;
		case 'planetscale':
			packageNames.add('@planetscale/database');
			break;
		case 'turso':
			packageNames.add('@libsql/client');
			break;
	}

	if (
		isLocal &&
		(databaseEngine === 'mysql' || databaseEngine === 'mariadb') &&
		orm === 'drizzle'
	)
		packageNames.add('mysql2');

	if (isLocal && databaseEngine === 'singlestore') packageNames.add('mysql2');

	if (databaseEngine === 'postgresql' && databaseHost === 'planetscale') {
		packageNames.add('pg');
		packageNames.add('@types/pg');
	}

	if (isLocal && databaseEngine === 'mssql') {
		packageNames.add('mssql');
		packageNames.add('@types/mssql');
	}

	if (isLocal && databaseEngine === 'gel') packageNames.add('gel');
	if (databaseEngine === 'mongodb') packageNames.add('mongodb');

	/* ── Fetch all versions in parallel ──────────────────────── */
	const s = spinner();
	let latestVersions = new Map<string, string>();

	if (latest) {
		s.start('Resolving package versions…');
		latestVersions = await getPackageVersions([...packageNames]);
	}

	const resolveVersion = (name: string, listed: string) =>
		latest ? (latestVersions.get(name) ?? listed) : listed;

	/* ── Build dependency maps ───────────────────────────────── */
	const dependencies: PackageJson['dependencies'] = {};
	const devDependencies: PackageJson['devDependencies'] = {};
	devDependencies['typescript'] = resolveVersion(
		'typescript',
		versions['typescript']
	);

	for (const p of defaultPlugins) {
		dependencies[p.value] = resolveVersion(p.value, p.latestVersion);
	}

	for (const dep of defaultDependencies) {
		dependencies[dep.value] = resolveVersion(dep.value, dep.latestVersion);
	}

	if (authOption === 'abs') {
		dependencies[absoluteAuthPlugin.value] = resolveVersion(
			absoluteAuthPlugin.value,
			absoluteAuthPlugin.latestVersion
		);
	}

	for (const pluginValue of plugins) {
		const meta = availablePlugins.find((p) => p.value === pluginValue);
		if (!meta) continue;
		dependencies[meta.value] = resolveVersion(
			meta.value,
			meta.latestVersion
		);
	}

	if (codeQualityTool === 'eslint+prettier') {
		eslintAndPrettierDependencies.forEach((dep) => {
			devDependencies[dep.value] = resolveVersion(
				dep.value,
				dep.latestVersion
			);
		});
	}

	if (useTailwind) {
		devDependencies['autoprefixer'] = resolveVersion(
			'autoprefixer',
			versions['autoprefixer']
		);
		devDependencies['postcss'] = resolveVersion(
			'postcss',
			versions['postcss']
		);
		devDependencies['tailwindcss'] = resolveVersion(
			'tailwindcss',
			versions['tailwindcss']
		);
		devDependencies['@tailwindcss/cli'] = resolveVersion(
			'@tailwindcss/cli',
			versions['@tailwindcss/cli']
		);
	}

	if (flags.requiresReact) {
		dependencies['react'] = resolveVersion('react', versions['react']);
		dependencies['react-dom'] = resolveVersion(
			'react-dom',
			versions['react-dom']
		);
		devDependencies['@types/react'] = resolveVersion(
			'@types/react',
			versions['@types/react']
		);
	}

	if (flags.requiresReact && codeQualityTool === 'eslint+prettier') {
		eslintReactDependencies.forEach((dep) => {
			devDependencies[dep.value] = resolveVersion(
				dep.value,
				dep.latestVersion
			);
		});
	}

	if (flags.requiresSvelte) {
		dependencies['svelte'] = resolveVersion('svelte', versions['svelte']);
	}

	if (flags.requiresSvelte && codeQualityTool === 'eslint+prettier') {
		devDependencies['prettier-plugin-svelte'] = resolveVersion(
			'prettier-plugin-svelte',
			versions['prettier-plugin-svelte']
		);
	}

	if (flags.requiresVue) {
		dependencies['vue'] = resolveVersion('vue', versions['vue']);
	}

	if (flags.requiresHtmx) {
		dependencies['elysia-scoped-state'] = resolveVersion(
			'elysia-scoped-state',
			versions['elysia-scoped-state']
		);
	}

	if (orm === 'drizzle') {
		dependencies['drizzle-orm'] = resolveVersion(
			'drizzle-orm',
			versions['drizzle-orm']
		);
	}

	switch (databaseHost) {
		case 'neon':
			dependencies['@neondatabase/serverless'] = resolveVersion(
				'@neondatabase/serverless',
				versions['@neondatabase/serverless']
			);
			break;
		case 'planetscale':
			dependencies['@planetscale/database'] = resolveVersion(
				'@planetscale/database',
				versions['@planetscale/database']
			);
			break;
		case 'turso':
			dependencies['@libsql/client'] = resolveVersion(
				'@libsql/client',
				versions['@libsql/client']
			);
			break;
	}

	if (latest) s.stop(green('Package versions resolved'));

	const scripts: PackageJson['scripts'] = {
		dev: 'absolutejs dev',
		format: `prettier --write "./**/*.{js,ts,css,json,mjs,md${flags.requiresReact ? ',jsx,tsx' : ''}${flags.requiresSvelte ? ',svelte' : ''}${flags.requiresVue ? ',vue' : ''}${flags.requiresHtml || flags.requiresHtmx ? ',html' : ''}}"`,
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	const isLocalDb = isLocal;

	if (
		isLocalDb &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== 'sqlite'
	) {
		const clientCmd = dbClientCommands[databaseEngine];
		const dockerPrefix = `docker compose -p ${databaseEngine} -f db/docker-compose.db.yml`;

		scripts['db:up'] = `${dockerPrefix} up -d --wait db`;
		scripts['db:down'] = `${dockerPrefix} down`;
		scripts['db:reset'] = `${dockerPrefix} down -v`;
		scripts[`db:${databaseEngine}`] =
			`${dockerPrefix} exec -it db bash -lc '${clientCmd}'`;

		scripts[`predb:${databaseEngine}`] = 'bun db:up';
		scripts[`postdb:${databaseEngine}`] = 'bun db:down';
	}

	if (
		isLocalDb &&
		(databaseEngine === 'mysql' || databaseEngine === 'mariadb') &&
		orm === 'drizzle'
	) {
		dependencies['mysql2'] = resolveVersion('mysql2', versions['mysql2']);
	}

	if (isLocalDb && databaseEngine === 'singlestore') {
		dependencies['mysql2'] = resolveVersion('mysql2', versions['mysql2']);
	}

	if (databaseEngine === 'postgresql' && databaseHost === 'planetscale') {
		dependencies['pg'] = resolveVersion('pg', versions['pg']);
		devDependencies['@types/pg'] = resolveVersion(
			'@types/pg',
			versions['@types/pg']
		);
	}

	if (isLocalDb && databaseEngine === 'mssql') {
		dependencies['mssql'] = resolveVersion('mssql', versions['mssql']);
		devDependencies['@types/mssql'] = resolveVersion(
			'@types/mssql',
			versions['@types/mssql']
		);
	}

	if (isLocalDb && databaseEngine === 'gel') {
		dependencies['gel'] = resolveVersion('gel', versions['gel']);
	}

	if (databaseEngine === 'mongodb') {
		dependencies['mongodb'] = resolveVersion(
			'mongodb',
			versions['mongodb']
		);
	}

	if (isLocalDb && databaseEngine === 'sqlite') {
		scripts['db:sqlite'] = 'sqlite3 db/database.sqlite';
		scripts['db:init'] = 'sqlite3 db/database.sqlite < db/init.sql';
	}

	if (orm === 'drizzle') {
		scripts['db:studio'] = 'drizzle-kit studio';
		scripts['db:push'] = 'drizzle-kit push';
	}

	const packageJson: PackageJson = {
		dependencies,
		devDependencies,
		name: projectName,
		scripts,
		type: 'module',
		version: '0.0.0'
	};

	writeFileSync(
		join(projectName, 'package.json'),
		JSON.stringify(packageJson, null, 2)
	);
};
