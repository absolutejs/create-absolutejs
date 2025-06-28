import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatProject } from './commands/formatProject';
import { installDependencies } from './commands/installDependencies';
import { availablePlugins } from './data';
import { addConfigurationFiles } from './generators/configurations/addConfigurationFiles';
import { createPackageJson } from './generators/configurations/createPackageJson';
import { initalizeRoot } from './generators/configurations/initializeRoot';
import { scaffoldDatabase } from './generators/db/scaffoldDatabase';
import { createServerFile } from './generators/project/createServer';
import { scaffoldFrontends } from './generators/project/scaffoldFrontends';
import type { PackageManager, CreateConfiguration } from './types';

type ScaffoldProps = {
	response: CreateConfiguration;
	packageManager: PackageManager;
	latest: boolean;
};

export const scaffold = ({
	response: {
		projectName,
		language,
		codeQualityTool,
		initializeGitNow,
		databaseEngine,
		databaseHost,
		htmlScriptOption,
		useTailwind,
		databaseDirectory,
		orm,
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

	const { frontendDirectory, backendDirectory } = initalizeRoot(
		projectName,
		templatesDirectory
	);

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

	createPackageJson({
		authProvider,
		codeQualityTool,
		frontendDirectories,
		latest,
		plugins,
		projectName,
		useTailwind
	});

	const serverFilePath = join(backendDirectory, 'server.ts');
	createServerFile({
		assetsDirectory,
		authProvider,
		availablePlugins,
		buildDirectory,
		frontendDirectories,
		plugins,
		serverFilePath,
		tailwind
	});

	void (
		databaseDirectory !== undefined &&
		scaffoldDatabase({
			databaseDirectory,
			databaseEngine,
			orm,
			projectName
		})
	);

	scaffoldFrontends({
		frontendDirectories,
		frontendDirectory,
		htmlScriptOption,
		language,
		tailwind,
		templatesDirectory
	});

	if (installDependenciesNow) {
		installDependencies({ packageManager, projectName });
	}

	formatProject({
		packageManager,
		projectName
	});
};
