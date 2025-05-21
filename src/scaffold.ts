import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spinner } from '@clack/prompts';
import { formatProject } from './commands/formatProject';
import { installDependencies } from './commands/installDependencies';
import { availablePlugins } from './data';
import { addConfigurationFiles } from './generators/addConfigurationFiles';
import { createFrontends } from './generators/createFrontends';
import { createPackageJson } from './generators/createPackageJson';
import { createServerFile } from './generators/createServer';
import { initalizeRoot } from './generators/initializeRoot';
import { scaffoldDatabase } from './generators/scaffoldDatabase';
import type { PackageManager, PromptResponse } from './types';

export const scaffold = (
	{
		projectName,
		language,
		codeQualityTool,
		initializeGitNow,
		databaseEngine,
		databaseHost,
		databaseDirectory,
		orm,
		plugins,
		authProvider,
		buildDirectory,
		assetsDirectory,
		tailwind,
		installDependenciesNow,
		frontendConfigurations
	}: PromptResponse,
	packageManager: PackageManager
) => {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const templatesDir = join(__dirname, '/templates');
	const s = spinner();

	const { frontendDir, backendDir } = initalizeRoot(projectName);

	copyFileSync(
		join(templatesDir, 'README.md'),
		join(projectName, 'README.md')
	);

	addConfigurationFiles({
		codeQualityTool,
		initializeGitNow,
		language,
		projectName,
		tailwind,
		templatesDir
	});

	createPackageJson({ authProvider, plugins, projectName, spin: s });

	const serverFilePath = join(backendDir, 'server.ts');
	createServerFile({
		assetsDirectory,
		authProvider,
		availablePlugins,
		buildDirectory,
		frontendConfigurations,
		plugins,
		serverFilePath,
		tailwind
	});

	databaseDirectory !== undefined &&
		void scaffoldDatabase({
			databaseEngine,
			orm,
			projectName,
			databaseDirectory
		});

	createFrontends({ frontendConfigurations, frontendDir, templatesDir });

	formatProject({
		packageManager,
		projectName,
		spinner: s
	});

	if (installDependenciesNow) {
		installDependencies({ packageManager, projectName, spinner: s });
	}
};
