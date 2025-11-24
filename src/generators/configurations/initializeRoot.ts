import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const initalizeRoot = (
	projectName: string,
	templatesDirectory: string
) => {
	if (existsSync(projectName)) {
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);
	}

	mkdirSync(projectName);
	const srcDir = join(projectName, 'src');
	mkdirSync(srcDir);
	const typesDirectory = join(srcDir, 'types');
	mkdirSync(typesDirectory);

	const constantsSrc = join(templatesDirectory, 'constants.ts');
	const constantsDest = join(srcDir, 'constants.ts');
	copyFileSync(constantsSrc, constantsDest);

	const frontendDirectory = join(srcDir, 'frontend');
	const backendDirectory = join(srcDir, 'backend');
	mkdirSync(frontendDirectory);
	mkdirSync(backendDirectory);

	const projectAssetsDirectory = join(backendDirectory, 'assets');
	mkdirSync(projectAssetsDirectory);
	mkdirSync(join(projectAssetsDirectory, 'ico'), { recursive: true });
	mkdirSync(join(projectAssetsDirectory, 'png'), { recursive: true });
	mkdirSync(join(projectAssetsDirectory, 'svg'), { recursive: true });

	copyFileSync(
		join(templatesDirectory, 'assets', 'ico', 'favicon.ico'),
		join(projectAssetsDirectory, 'ico', 'favicon.ico')
	);
	copyFileSync(
		join(templatesDirectory, 'assets', 'png', 'absolutejs-temp.png'),
		join(projectAssetsDirectory, 'png', 'absolutejs-temp.png')
	);

	return { backendDirectory, frontendDirectory, projectAssetsDirectory, typesDirectory };
};
