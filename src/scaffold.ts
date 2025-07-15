import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatProject } from './commands/formatProject';
import { initializeGit } from './commands/initializeGit';
import { installDependencies } from './commands/installDependencies';
import { availablePlugins } from './data';
import { addConfigurationFiles } from './generators/configurations/addConfigurationFiles';
import { createPackageJson } from './generators/configurations/generatePackageJson';
import { initalizeRoot } from './generators/configurations/initializeRoot';
import { scaffoldDatabase } from './generators/db/scaffoldDatabase';
import { generateServerFile } from './generators/project/generateServer';
import { scaffoldFrontends } from './generators/project/scaffoldFrontends';
import type { PackageManager, CreateConfiguration } from './types';

type ScaffoldProps = {
	response: CreateConfiguration;
	packageManager: PackageManager;
	latest: boolean;
};

export const scaffold = async ({
	response: {
		projectName,
		codeQualityTool,
		initializeGitNow,
		databaseEngine,
		databaseHost,
		useHTMLScripts,
		useTailwind,
		databaseDirectory,
		orm,
		frontends,
		plugins,
		authProvider,
		buildDirectory,
		assetsDirectory,
		tailwind,
		installDependenciesNow,
		frontendDirectories
	},
	latest,
	packageManager
}: ScaffoldProps) => {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const templatesDirectory = join(__dirname, '/templates');

	const { frontendDirectory, backendDirectory, projectAssetsDirectory } =
		initalizeRoot(projectName, templatesDirectory);

	copyFileSync(
		join(templatesDirectory, 'README.md'),
		join(projectName, 'README.md')
	);

	addConfigurationFiles({
		codeQualityTool,
		frontends,
		initializeGitNow,
		projectName,
		tailwind,
		templatesDirectory
	});

	createPackageJson({
		authProvider,
		codeQualityTool,
		databaseHost,
		frontendDirectories,
		latest,
		plugins,
		projectName,
		useTailwind
	});

	generateServerFile({
		assetsDirectory,
		authProvider,
		availablePlugins,
		backendDirectory,
		buildDirectory,
		databaseHost,
		frontendDirectories,
		orm,
		plugins,
		tailwind
	});

	void (
		databaseDirectory !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== undefined &&
		scaffoldDatabase({
			authProvider,
			databaseDirectory,
			databaseEngine,
			databaseHost,
			orm,
			projectName
		})
	);

	scaffoldFrontends({
		frontendDirectories,
		frontendDirectory,
		frontends,
		projectAssetsDirectory,
		templatesDirectory,
		useHTMLScripts
	});

	if (installDependenciesNow) {
		await installDependencies(packageManager, projectName);
	}

	await formatProject({
		installDependenciesNow,
		packageManager,
		projectName
	});

	if (initializeGitNow) {
		await initializeGit(projectName);
	}
};
