import { writeFileSync } from 'fs';
import { join } from 'path';
import type { AvailablePlugin, PackageJson } from '../types';

export const createPackageJson = (
	root: string,
	projectName: string,
	plugins: AvailablePlugin[]
) => {
	const dependencies: PackageJson['dependencies'] = {
		elysia: '1.2.0',
        
	};
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
