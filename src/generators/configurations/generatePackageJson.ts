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
	| 'plugins'
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
	useTailwind,
	latest,
	frontendDirectories,
	codeQualityTool
}: CreatePackageJsonProps) => {
	const s = spinner();
	void (latest && s.start('Resolving package versions…'));

	const resolveVersion = (name: string, listed: string) =>
		latest ? (getPackageVersion(name) ?? listed) : listed;

	const dependencies: PackageJson['dependencies'] = {};
	const devDependencies: PackageJson['devDependencies'] = {};

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

	if (frontendDirectories['react'] !== undefined) {
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

	void (latest && s.stop(green('Package versions resolved')));

	const scripts: PackageJson['scripts'] = {
		dev: 'bun run src/backend/server.ts',
		format: 'prettier --write "./**/*.{js,jsx,ts,tsx,css,json,mjs,md}"',
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	const packageJson: PackageJson = {
		dependencies,
		devDependencies,
		name: projectName,
		scripts,
		type: 'module',
		version: '0.1.0'
	};

	writeFileSync(
		join(projectName, 'package.json'),
		JSON.stringify(packageJson)
	);
};
