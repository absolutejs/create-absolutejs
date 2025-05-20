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

	const frontendDir = join(srcDir, 'frontend');
	const backendDir = join(srcDir, 'backend');
	mkdirSync(frontendDir, { recursive: true });
	mkdirSync(backendDir, { recursive: true });
	mkdirSync(join(srcDir, 'types'), { recursive: true });

	return {
		backendDir,
		frontendDir
	};
};
