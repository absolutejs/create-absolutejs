import { copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { formatProject } from './commands/formatProject';
import { initializeGit } from './commands/initializeGit';
import { installDependencies } from './commands/installDependencies';
import { createPackageJson } from './generators/configurations/generatePackageJson';
import { initalizeRoot } from './generators/configurations/initializeRoot';
import { scaffoldConfigurationFiles } from './generators/configurations/scaffoldConfigurationFiles';
import { scaffoldDatabase } from './generators/db/scaffoldDatabase';
import { scaffoldBackend } from './generators/project/scaffoldBackend';
import { scaffoldFrontends } from './generators/project/scaffoldFrontends';
import type { PackageManager, CreateConfiguration } from './types';
import { resolveDatabasePort } from './utils/resolveDatabasePort';

type ScaffoldProps = {
	response: CreateConfiguration;
	packageManager: PackageManager;
	latest: boolean;
	envVariables: string[] | undefined;
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
		absProviders,
		orm,
		frontends,
		plugins,
		authOption,
		buildDirectory,
		assetsDirectory,
		tailwind,
		installDependenciesNow,
		frontendDirectories
	},
	latest,
	envVariables,
	packageManager
}: ScaffoldProps) => {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const templatesDirectory = join(__dirname, '/templates');

	const {
		frontendDirectory,
		backendDirectory,
		projectAssetsDirectory,
		typesDirectory
	} = initalizeRoot(projectName, templatesDirectory);

	copyFileSync(
		join(templatesDirectory, 'README.md'),
		join(projectName, 'README.md')
	);

	const isLocalDocker =
		(databaseHost === 'none' || databaseHost === undefined) &&
		databaseEngine !== 'none' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'sqlite';
	const databasePort = isLocalDocker
		? await resolveDatabasePort(databaseEngine)
		: undefined;

	scaffoldConfigurationFiles({
		codeQualityTool,
		databaseDirectory,
		databaseEngine,
		databaseHost,
		databasePort,
		envVariables,
		frontends,
		initializeGitNow,
		projectName,
		tailwind,
		templatesDirectory
	});

	createPackageJson({
		authOption,
		codeQualityTool,
		databaseEngine,
		databaseHost,
		databaseDirectory,
		frontendDirectories,
		latest,
		orm,
		plugins,
		projectName,
		useTailwind
	});

	scaffoldBackend({
		absProviders,
		assetsDirectory,
		authOption,
		backendDirectory,
		buildDirectory,
		databaseDirectory,
		databaseEngine,
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
		(await scaffoldDatabase({
			authOption,
			backendDirectory,
			databaseDirectory,
			databaseEngine,
			databaseHost,
			databasePort,
			orm,
			projectName,
			typesDirectory
		}))
	);

	scaffoldFrontends({
		absProviders,
		assetsDirectory,
		authOption,
		frontendDirectories,
		frontendDirectory,
		frontends,
		projectAssetsDirectory,
		templatesDirectory,
		useHTMLScripts,
		useTailwind
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
