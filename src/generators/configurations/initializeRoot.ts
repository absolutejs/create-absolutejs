import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const initalizeRoot = (
	projectName: string,
	templatesDirectory: string
) => {
	if (existsSync(projectName))
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);

	mkdirSync(projectName);

	const srcDir = join(projectName, 'src');
	mkdirSync(srcDir);

	copyFileSync(
		join(templatesDirectory, 'constants.ts'),
		join(projectName, 'src', 'constants.ts')
	);

	const frontendDirectory = join(srcDir, 'frontend');
	const backendDirectory = join(srcDir, 'backend');

	mkdirSync(frontendDirectory);
	mkdirSync(backendDirectory);
	mkdirSync(join(srcDir, 'types'));

	cpSync(
		join(templatesDirectory, 'assets'),
		join(backendDirectory, 'assets'),
		{ recursive: true }
	);

	return {
		backendDirectory,
		frontendDirectory
	};
};
