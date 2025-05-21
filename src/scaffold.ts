import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spinner } from '@clack/prompts';
import { formatProject } from './commands/formatProject';
import { installDependencies } from './commands/installDependencies';
import { availablePlugins } from './data';
import { addConfigurationFiles } from './generators/configurations/addConfigurationFiles';
import { createFrontends } from './generators/createFrontends';
import { createPackageJson } from './generators/configurations/createPackageJson';
import { createServerFile } from './generators/createServer';
import { initalizeRoot } from './generators/configurations/initializeRoot';
import { scaffoldDatabase } from './generators/db/scaffoldDatabase';
import type { PackageManager, PromptResponse } from './types';

export const scaffold = (
	{
		projectName,
		language,
		codeQualityTool,
		initializeGitNow,
		databaseEngine,
		databaseHost,
		htmlScriptOption,
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
	const templatesDirectory = join(__dirname, '/templates');
	const s = spinner();

	const { frontendDirectory, backendDirectory } = initalizeRoot(projectName);

	copyFileSync(
		join(templatesDirectory, 'README.md'),
		join(projectName, 'README.md')
	);

	addConfigurationFiles({
		codeQualityTool,
		initializeGitNow,
		language,
		projectName,
		tailwind,
		templatesDirectory
	});

	createPackageJson({ authProvider, plugins, projectName, spin: s });

	const serverFilePath = join(backendDirectory, 'server.ts');
	createServerFile({
		assetsDirectory,
		authProvider,
		availablePlugins,
		buildDirectory,
		frontendConfigurations,
		htmlScriptOption,
		plugins,
		serverFilePath,
		tailwind
	});

	databaseDirectory !== undefined &&
		void scaffoldDatabase({
			databaseDirectory,
			databaseEngine,
			orm,
			projectName
		});

	createFrontends({
		frontendConfigurations,
		frontendDirectory,
		htmlScriptOption,
		templatesDirectory
	});

	formatProject({
		packageManager,
		projectName,
		spinner: s
	});

	if (installDependenciesNow) {
		installDependencies({ packageManager, projectName, spinner: s });
	}
};
