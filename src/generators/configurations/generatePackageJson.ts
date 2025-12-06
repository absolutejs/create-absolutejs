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
	devDependencies['typescript'] = resolveVersion('typescript', '5.9.3');

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
			'10.4.21'
		);
		devDependencies['postcss'] = resolveVersion('postcss', '8.5.3');
		devDependencies['tailwindcss'] = resolveVersion('tailwindcss', '4.1.7');
		devDependencies['@tailwindcss/cli'] = resolveVersion(
			'@tailwindcss/cli',
			'4.1.7'
		);
	}

	if (flags.requiresReact) {
		dependencies['react'] = resolveVersion('react', '19.2.1');
		devDependencies['@types/react'] = resolveVersion(
			'@types/react',
			'19.2.0'
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
		dependencies['svelte'] = resolveVersion('svelte', '5.34.7');
	}

	if (flags.requiresSvelte && codeQualityTool === 'eslint+prettier') {
		devDependencies['prettier-plugin-svelte'] = resolveVersion(
			'prettier-plugin-svelte',
			'3.4.0'
		);
	}

	if (flags.requiresVue) {
		dependencies['vue'] = resolveVersion('vue', '3.5.17');
	}

	if (flags.requiresHtmx) {
		dependencies['elysia-scoped-state'] = resolveVersion(
			'elysia-scoped-state',
			'0.1.1'
		);
	}

	if (orm === 'drizzle') {
		dependencies['drizzle-orm'] = resolveVersion('drizzle-orm', '0.41.0');
	}

	switch (databaseHost) {
		case 'neon':
			dependencies['@neondatabase/serverless'] = resolveVersion(
				'@neondatabase/serverless',
				'1.0.0'
			);
			break;
		case 'planetscale':
			dependencies['@planetscale/database'] = resolveVersion(
				'@planetscale/database',
				'1.19.0'
			);
			break;
		case 'turso':
			dependencies['@libsql/client'] = resolveVersion(
				'@libsql/client',
				'0.15.9'
			);
			break;
	}

	if (latest) s.stop(green('Package versions resolved'));

	const scripts: PackageJson['scripts'] = {
		dev: 'bash -c \'trap "exit 0" INT; bun run --watch src/backend/server.ts\'',
		format: `prettier --write "./**/*.{js,ts,css,json,mjs,md${flags.requiresReact ? ',jsx,tsx' : ''}${flags.requiresSvelte ? ',svelte' : ''}${flags.requiresVue ? ',vue' : ''}${flags.requiresHtml || flags.requiresHtmx ? ',html' : ''}}"`,
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	const isLocal = !databaseHost || databaseHost === 'none';

	if (
		isLocal &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== 'sqlite' &&
		databaseEngine !== 'mongodb'
	) {
		const config = dbScripts[databaseEngine];
		const dockerPrefix = `docker compose -p ${databaseEngine} -f db/docker-compose.db.yml`;

		scripts['db:up'] = `${dockerPrefix} up -d db`;
		scripts['postdb:up'] =
			`${dockerPrefix} exec db bash -lc '${config.waitCmd}'`;
		scripts['db:down'] = `${dockerPrefix} down`;
		scripts['db:reset'] = `${dockerPrefix} down -v`;
		scripts[`db:${databaseEngine}`] =
			`${dockerPrefix} exec -it db bash -lc '${config.clientCmd}'`;

		scripts['predev'] = 'bun db:up';
		scripts[`predb:${databaseEngine}`] = 'bun db:up';
		scripts['postdev'] = 'bun db:down';
		scripts[`postdb:${databaseEngine}`] = 'bun db:down';
	}

	if (
		isLocal &&
		(databaseEngine === 'mysql' || databaseEngine === 'mariadb') &&
		orm === 'drizzle'
	) {
		dependencies['mysql2'] = resolveVersion('mysql2', '3.14.2');
	}

	if (isLocal && databaseEngine === 'singlestore') {
		dependencies['mysql2'] = resolveVersion('mysql2', '3.14.2');
	}

	if (databaseEngine === 'postgresql' && databaseHost === 'planetscale') {
		dependencies['pg'] = resolveVersion('pg', '8.11.0');
		devDependencies['@types/pg'] = resolveVersion('@types/pg', '8.6.1');
	}

	if (isLocal && databaseEngine === 'mssql') {
		dependencies['mssql'] = resolveVersion('mssql', '12.1.0');
		devDependencies['@types/mssql'] = resolveVersion(
			'@types/mssql',
			'9.1.8'
		);
	}

	if (isLocal && databaseEngine === 'gel') {
		dependencies['gel'] = resolveVersion('gel', '2.1.1');
	}

	if (isLocal && databaseEngine === 'sqlite') {
		scripts['db:sqlite'] = 'sqlite3 db/database.sqlite';
		scripts['db:init'] = 'sqlite3 db/database.sqlite < db/init.sql';
	}

	if (orm === 'drizzle') {
		scripts["db:studio"] = "drizzle-kit studio";
		scripts["db:push"] = "drizzle-kit push";
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
