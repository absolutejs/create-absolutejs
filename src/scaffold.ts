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
}: ScaffoldProps): Promise<{ dockerFreshInstall: boolean }> => {
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

	scaffoldConfigurationFiles({
		codeQualityTool,
		databaseEngine,
		databaseHost,
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
		databaseEngine,
		databaseHost,
		frontendDirectories,
		orm,
		plugins,
		publicDirectory: 'public',
		tailwind
	});

	let dockerFreshInstall = false;
	if (
		databaseDirectory !== undefined &&
		databaseEngine !== 'none' &&
		databaseEngine !== undefined
	) {
		const result = await scaffoldDatabase({
			authOption,
			backendDirectory,
			databaseDirectory,
			databaseEngine,
			databaseHost,
			orm,
			projectName,
			typesDirectory
		});
		dockerFreshInstall = result.dockerFreshInstall;
	}

	scaffoldFrontends({
		absProviders,
		assetsDirectory,
		authOption,
		frontendDirectories,
		frontendDirectory,
		frontends,
		projectAssetsDirectory,
		templatesDirectory,
		typesDirectory,
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

	return { dockerFreshInstall };
};
