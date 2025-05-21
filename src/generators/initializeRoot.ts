import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const initalizeRoot = (projectName: string) => {
	if (existsSync(projectName))
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);

	mkdirSync(projectName, { recursive: true });
	const srcDir = join(projectName, 'src');
	mkdirSync(srcDir, { recursive: true });

	const frontendDirectory = join(srcDir, 'frontend');
	const backendDirectory = join(srcDir, 'backend');
	mkdirSync(frontendDirectory, { recursive: true });
	mkdirSync(backendDirectory, { recursive: true });
	mkdirSync(join(srcDir, 'types'), { recursive: true });

	return {
		backendDirectory,
		frontendDirectory
	};
};
