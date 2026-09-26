import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { formatProject } from './commands/formatProject';
import { initializeGit } from './commands/initializeGit';
import { installDependencies } from './commands/installDependencies';
import { migrateDatabase } from './commands/migrateDatabase';
import { createPackageJson } from './generators/configurations/generatePackageJson';
import { initalizeRoot } from './generators/configurations/initializeRoot';
import { scaffoldConfigurationFiles } from './generators/configurations/scaffoldConfigurationFiles';
import { scaffoldDatabase } from './generators/db/scaffoldDatabase';
import { scaffoldAgentic } from './generators/project/scaffoldAgentic';
import { scaffoldBackend } from './generators/project/scaffoldBackend';
import { scaffoldFrontends } from './generators/project/scaffoldFrontends';
import type { PackageManager, CreateConfiguration } from './types';
import { validateDatabaseSelection } from './utils/validateDatabaseSelection';

type ScaffoldProps = {
	response: CreateConfiguration;
	packageManager: PackageManager;
	latest: boolean;
	envVariables: string[] | undefined;
	verifyLocalDatabase?: boolean;
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
	verifyLocalDatabase = true,
	envVariables,
	packageManager
}: ScaffoldProps): Promise<{
	databaseMigrationPending: boolean;
	dockerFreshInstall: boolean;
}> => {
	const { errors: databaseErrors } = validateDatabaseSelection({
		databaseEngine,
		databaseHost,
		orm
	});
	if (databaseErrors.length > 0) throw new Error(databaseErrors.join('\n'));
	if (orm === 'prisma')
		throw new Error(
			'Prisma scaffolding is not implemented. Choose Drizzle or no ORM.'
		);
	if (authOption === 'abs' && (!databaseEngine || databaseEngine === 'none'))
		throw new Error(
			'Authentication requires a database for persistent users. Select a database or omit --auth.'
		);
	if (
		authOption === 'abs' &&
		(!absProviders?.length ||
			absProviders.some((provider) => provider !== 'google'))
	)
		throw new Error(
			'Automatic auth scaffolding currently supports --abs-provider google. Configure other providers with the auth package after creation.'
		);
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
			typesDirectory,
			verifyLocalDatabase
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
		`import { treaty } from '@elysia/eden'
import type { Api } from '../../backend/api'

const serverUrl =
	typeof window !== 'undefined'
		? window.location.origin
		: 'http://localhost:3000'

export const server = treaty<Api>(serverUrl)
`
	);

	if (installDependenciesNow) {
		await installDependencies(packageManager, projectName);
	}

	const databaseMigrated =
		orm === 'drizzle' &&
		installDependenciesNow &&
		(await migrateDatabase({
			databaseEngine,
			databaseHost,
			projectName,
			verifyLocalDatabase
		}));

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

	return {
		databaseMigrationPending: orm === 'drizzle' && !databaseMigrated,
		dockerFreshInstall
	};
};
