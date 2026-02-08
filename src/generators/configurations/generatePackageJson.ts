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
import { getPackageVersion } from '../../utils/getPackageVersion';
import { versions } from '../../versions';
import { initTemplates } from '../db/dockerInitTemplates';
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

const dbScripts = {
	cockroachdb: {
		clientCmd: 'cockroach sql --insecure --database=database',
		waitCmd: initTemplates.cockroachdb.wait
	},
	gel: {
		clientCmd:
			'gel -H localhost -P 5656 -u admin --tls-security insecure -b main',
		waitCmd: initTemplates.gel.wait
	},
	mariadb: {
		clientCmd:
			'MYSQL_PWD=userpassword mariadb -h127.0.0.1 -u user database',
		waitCmd: initTemplates.mariadb.wait
	},
	mongodb: {
		clientCmd:
			'mongosh -u user -p password --authenticationDatabase admin database',
		waitCmd: initTemplates.mongodb.wait
	},
	mssql: {
		clientCmd:
			'/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P SApassword1',
		waitCmd: initTemplates.mssql.wait
	},
	mysql: {
		clientCmd: 'MYSQL_PWD=userpassword mysql -h127.0.0.1 -u user database',
		waitCmd: initTemplates.mysql.wait
	},
	postgresql: {
		clientCmd: 'psql -h localhost -U user -d database',
		waitCmd: initTemplates.postgresql.wait
	},
	singlestore: {
		clientCmd: 'singlestore -u root -ppassword -D database',
		waitCmd: initTemplates.singlestore.wait
	}
} as const;

export const createPackageJson = ({
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
	const s = spinner();
	if (latest) s.start('Resolving package versions…');

	const resolveVersion = (name: string, listed: string) =>
		latest ? (getPackageVersion(name) ?? listed) : listed;

	const dependencies: PackageJson['dependencies'] = {};
	const devDependencies: PackageJson['devDependencies'] = {};
	devDependencies['typescript'] = resolveVersion(
		'typescript',
		versions['typescript']
	);

	const flags = computeFlags(frontendDirectories);

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

	const isLocal = !databaseHost || databaseHost === 'none';
	const hasLocalDocker =
		isLocal &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== 'sqlite';

	const scripts: PackageJson['scripts'] = {
		dev: hasLocalDocker
			? 'bun run scripts/dev-with-db.ts'
			: 'bun run --watch src/backend/server.ts',
		format: `prettier --write "./**/*.{js,ts,css,json,mjs,md${flags.requiresReact ? ',jsx,tsx' : ''}${flags.requiresSvelte ? ',svelte' : ''}${flags.requiresVue ? ',vue' : ''}${flags.requiresHtml || flags.requiresHtmx ? ',html' : ''}}"`,
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	if (hasLocalDocker) {
		const config = dbScripts[databaseEngine];
		const dockerPrefix = `docker compose -p ${databaseEngine} -f db/docker-compose.db.yml`;

		scripts['db:up'] = `${dockerPrefix} up -d db`;
		scripts['postdb:up'] =
			`${dockerPrefix} exec db bash -lc '${config.waitCmd}'`;
		scripts['db:down'] = `${dockerPrefix} down`;
		scripts['db:reset'] = `${dockerPrefix} down -v`;
		scripts[`db:${databaseEngine}`] =
			`${dockerPrefix} exec -it db bash -lc '${config.clientCmd}'`;
		scripts[`predb:${databaseEngine}`] = 'bun db:up';
		scripts[`postdb:${databaseEngine}`] = 'bun db:down';
	}

	if (
		isLocal &&
		(databaseEngine === 'mysql' || databaseEngine === 'mariadb') &&
		orm === 'drizzle'
	) {
		dependencies['mysql2'] = resolveVersion('mysql2', versions['mysql2']);
	}

	if (isLocal && databaseEngine === 'singlestore') {
		dependencies['mysql2'] = resolveVersion('mysql2', versions['mysql2']);
	}

	if (databaseEngine === 'postgresql' && databaseHost === 'planetscale') {
		dependencies['pg'] = resolveVersion('pg', versions['pg']);
		devDependencies['@types/pg'] = resolveVersion(
			'@types/pg',
			versions['@types/pg']
		);
	}

	if (isLocal && databaseEngine === 'mssql') {
		dependencies['mssql'] = resolveVersion('mssql', versions['mssql']);
		devDependencies['@types/mssql'] = resolveVersion(
			'@types/mssql',
			versions['@types/mssql']
		);
	}

	if (isLocal && databaseEngine === 'gel') {
		dependencies['gel'] = resolveVersion('gel', versions['gel']);
	}

	if (databaseEngine === 'mongodb') {
		dependencies['mongodb'] = resolveVersion(
			'mongodb',
			versions['mongodb']
		);
	}

	if (isLocal && databaseEngine === 'sqlite') {
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
