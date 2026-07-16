import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
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
import { scaffoldAgentic } from './generators/project/scaffoldAgentic';
import type { PackageManager, CreateConfiguration } from './types';

type ScaffoldProps = {
	response: CreateConfiguration;
	packageManager: PackageManager;
	latest: boolean;
	envVariables: string[] | undefined;
};

export const scaffold = async ({
	response: {
		agentic,
		projectName,
		codeQualityTool,
		initializeGitNow,
		githubLink,
		githubRepoUrl,
		githubVisibility,
		databaseEngine,
		databaseHost,
		useHTMLScripts,
		useTailwind,
		databaseDirectory,
		absProviders,
		includeExamples,
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

	await createPackageJson({
		agentic,
		authOption,
		codeQualityTool,
		databaseEngine,
		databaseHost,
		frontendDirectories,
		latest,
		orm,
		plugins,
		projectName,
		repositoryUrl: githubRepoUrl,
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
		tailwind,
		typesDirectory
	});

	if (agentic) scaffoldAgentic({ backendDirectory, projectName });

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
		({ dockerFreshInstall } = result);
	}

	scaffoldFrontends({
		absProviders,
		assetsDirectory,
		authOption,
		frontendDirectories,
		frontendDirectory,
		frontends,
		includeExamples,
		projectAssetsDirectory,
		templatesDirectory,
		typesDirectory,
		useHTMLScripts,
		useTailwind
	});

	const utilsDirectory = join(frontendDirectory, 'utils');
	mkdirSync(utilsDirectory, { recursive: true });
	writeFileSync(
		join(utilsDirectory, 'edenTreaty.ts'),
		`import { treaty } from '@elysiajs/eden'
import type { Server } from '../../backend/server'

const serverUrl =
	typeof window !== 'undefined'
		? window.location.origin
		: 'http://localhost:3000'

export const server = treaty<Server>(serverUrl)
`
	);

	if (installDependenciesNow) {
		await installDependencies(packageManager, projectName);
	}

	await formatProject({
		installDependenciesNow,
		packageManager,
		projectName
	});

	if (initializeGitNow) {
		await initializeGit({
			githubLink,
			githubRepoUrl,
			githubVisibility,
			projectName
		});
	}

	return { dockerFreshInstall };
};
