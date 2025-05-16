import { writeFileSync } from 'fs';
import { join } from 'path';
import { absoluteAuthPlugin, availablePlugins, defaultPlugins } from '../data';
import type { AuthProvier, PackageJson } from '../types';
import { getPackageVersion } from '../utils/getPackageVersion';

type CreatePackageJsonProps = {
	root: string;
	authProvider: AuthProvier;
	projectName: string;
	plugins: string[];
	spin: {
		start: (msg?: string) => void;
		stop: (msg?: string, code?: number) => void;
		message: (msg?: string) => void;
	};
};

export const createPackageJson = ({
	root,
	projectName,
	authProvider,
	plugins,
	spin
}: CreatePackageJsonProps) => {
	spin.message('Getting latest package versions…');

	const authPlugin =
		authProvider === 'absoluteAuth' ? absoluteAuthPlugin : [];
	const dependencies: PackageJson['dependencies'] = {};
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

	const devDependencies: PackageJson['devDependencies'] = {};

	const scripts: PackageJson['scripts'] = {
		dev: 'bun run src/index.ts',
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

	writeFileSync(join(root, 'package.json'), JSON.stringify(packageJson));
};
