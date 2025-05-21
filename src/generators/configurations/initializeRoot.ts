import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const initalizeRoot = (projectName: string) => {
	if (existsSync(projectName))
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);

	mkdirSync(projectName);
	const srcDir = join(projectName, 'src');
	mkdirSync(srcDir);

	const frontendDirectory = join(srcDir, 'frontend');
	const backendDirectory = join(srcDir, 'backend');
	mkdirSync(frontendDirectory);
	mkdirSync(backendDirectory);
	mkdirSync(join(srcDir, 'types'));

	return {
		backendDirectory,
		frontendDirectory
	};
};
