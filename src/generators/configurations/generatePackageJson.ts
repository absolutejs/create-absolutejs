import { writeFileSync } from 'fs';
import { join } from 'path';
import { spinner } from '@clack/prompts';
import { green } from 'picocolors';
import {
	absoluteAuthPlugin,
	availablePlugins,
	defaultPlugins,
	eslintAndPrettierDependencies
} from '../../data';
import type { CreateConfiguration, PackageJson } from '../../types';
import { getPackageVersion } from '../../utils/getPackageVersion';

type CreatePackageJsonProps = Pick<
	CreateConfiguration,
	| 'authProvider'
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

export const createPackageJson = ({
	projectName,
	authProvider,
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

	const requiresReact = Boolean(frontendDirectories['react']);
	const requiresSvelte = Boolean(frontendDirectories['svelte']);
	const requiresVue = Boolean(frontendDirectories['vue']);
	const requiresHtmx = Boolean(frontendDirectories['htmx']);
	const requiresHtml = Boolean(frontendDirectories['html']);

	for (const p of defaultPlugins) {
		dependencies[p.value] = resolveVersion(p.value, p.latestVersion);
	}

	if (authProvider === 'absoluteAuth') {
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

	if (requiresReact) {
		dependencies['react'] = resolveVersion('react', '19.1.0');
		dependencies['react-dom'] = resolveVersion('react-dom', '19.1.0');
		devDependencies['@types/react'] = resolveVersion(
			'@types/react',
			'19.1.5'
		);
		devDependencies['@types/react-dom'] = resolveVersion(
			'@types/react-dom',
			'19.1.5'
		);
	}

	if (requiresSvelte) {
		dependencies['svelte'] = resolveVersion('svelte', '5.34.7');
		if (codeQualityTool === 'eslint+prettier') {
			devDependencies['prettier-plugin-svelte'] = resolveVersion(
				'prettier-plugin-svelte',
				'3.4.0'
			);
		}
	}

	if (requiresVue) {
		dependencies['vue'] = resolveVersion('vue', '3.5.17');
	}

	if (requiresHtmx) {
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
				'1.0.0'
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
		format: `prettier --write "./**/*.{js,ts,css,json,mjs,md${requiresReact ? ',jsx,tsx' : ''}${requiresSvelte ? ',svelte' : ''}${requiresVue ? ',vue' : ''}${requiresHtml || requiresHtmx ? ',html' : ''}}"`,
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	if (
		databaseEngine === 'postgresql' &&
		(!databaseHost || databaseHost === 'none')
	) {
		scripts['db:up'] =
			'sh -c "docker info >/dev/null 2>&1 || sudo service docker start; docker compose -f db/docker-compose.db.yml up -d db"';
		scripts['db:down'] = 'docker compose -f db/docker-compose.db.yml down';
		scripts['db:psql'] =
			'docker compose -f db/docker-compose.db.yml exec db psql -U postgres -d appdb';
		scripts['predev'] = 'bun db:up';
		scripts['postdev'] = 'bun db:down';
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
