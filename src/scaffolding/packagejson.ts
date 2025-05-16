import { writeFileSync } from 'fs';
import { join } from 'path';
import { availablePlugins } from '../data';
import type { PackageJson } from '../types';
import { getPackageVersion } from '../utils/getPackageVersion';

export const createPackageJson = (
	root: string,
	projectName: string,
	plugins: string[],
	s: {
		start: (msg?: string) => void;
		stop: (msg?: string, code?: number) => void;
		message: (msg?: string) => void;
	}
) => {
	const dependencies: PackageJson['dependencies'] = {
		elysia: '1.3.0'
	};

	s.message('Getting latest package versions...');
	plugins.forEach((plugin) => {
		const foundPlugin = availablePlugins.find((p) => p.value === plugin);
		if (foundPlugin) {
			dependencies[foundPlugin.value] =
				getPackageVersion(foundPlugin.value) ??
				foundPlugin.latestVersion;
		}
	});

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
