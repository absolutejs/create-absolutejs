import { writeFileSync } from 'fs';
import { join } from 'path';
import { spinner } from '@clack/prompts';
import {
	absoluteAuthPlugin,
	availablePlugins,
	defaultPlugins
} from '../../data';
import type {
	AuthProvier,
	FrontendConfiguration,
	PackageJson
} from '../../types';
import { getPackageVersion } from '../../utils/getPackageVersion';

type CreatePackageJsonProps = {
	projectName: string;
	authProvider: AuthProvier;
	useTailwind: boolean;
	plugins: string[];
	frontendConfigurations: FrontendConfiguration[];
};

export const createPackageJson = ({
	projectName,
	authProvider,
	plugins,
	useTailwind,
	frontendConfigurations
}: CreatePackageJsonProps) => {
	const s = spinner();

	s.start('Getting latest package versions…');

	const dependencies: PackageJson['dependencies'] = {};
	const devDependencies: PackageJson['devDependencies'] = {};

	const authPlugin =
		authProvider === 'absoluteAuth' ? absoluteAuthPlugin : [];

	for (const p of defaultPlugins.concat(authPlugin)) {
		const version = getPackageVersion(p.value);
		dependencies[p.value] = version ?? p.latestVersion;
	}

	for (const pluginValue of plugins) {
		const meta = availablePlugins.find((p) => p.value === pluginValue);
		if (!meta) continue;
		dependencies[meta.value] =
			getPackageVersion(meta.value) ?? meta.latestVersion;
	}

	if (useTailwind) {
		devDependencies['autoprefixer'] =
			getPackageVersion('autoprefixer') ?? '10.4.21';
		devDependencies['postcss'] = getPackageVersion('postcss') ?? '8.5.3';
		devDependencies['tailwindcss'] =
			getPackageVersion('tailwindcss') ?? '4.1.7';
	}

	if (frontendConfigurations.find((f) => f.name === 'react')) {
		dependencies['react'] = getPackageVersion('react') ?? '19.1.0';
		dependencies['react-dom'] = getPackageVersion('react-dom') ?? '19.1.0';
		devDependencies['@types/react'] =
			getPackageVersion('@types/react') ?? '19.1.5';
		devDependencies['@types/react-dom'] =
			getPackageVersion('@types/react-dom') ?? '19.1.5';
	}

	s.stop('Package versions fetched');

	const scripts: PackageJson['scripts'] = {
		dev: 'bun run src/backend/server.ts',
		format: 'prettier --write "./**/*.{js,jsx,ts,tsx,css,json}"',
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
