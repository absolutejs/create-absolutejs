import { getAuthOption } from './questions/authOption';
import { getAgentic } from './questions/agentic';
import { getCodeQualityTool } from './questions/codeQualityTool';
import { getConfigurationType } from './questions/configurationType';
import { getDatabaseEngine } from './questions/databaseEngine';
import { getDatabaseHost } from './questions/databaseHost';
import { getDirectoryConfiguration } from './questions/directoryConfiguration';
import { getFrontendDirectoryConfigurations } from './questions/frontendDirectoryConfigurations';
import { getFrontends } from './questions/frontends';
import { getGithubLink } from './questions/githubLink';
import { getHtmlScriptingOption } from './questions/htmlScriptingOption';
import { getIncludeExamples } from './questions/includeExamples';
import { getInitializeGit } from './questions/initializeGitNow';
import { getInstallDependencies } from './questions/installDependenciesNow';
import { getORM } from './questions/orm';
import { getPlugins } from './questions/plugins';
import { getProjectName } from './questions/projectName';
import { getUseTailwind } from './questions/useTailwind';
import type { ArgumentConfiguration, CreateConfiguration } from './types';
import { orPrompt } from './utils/interactive';

export const prompt = async (argumentConfiguration: ArgumentConfiguration) => {
	// 1. Project name
	const projectName =
		argumentConfiguration.projectName ??
		(await orPrompt('a project name', getProjectName));

	// 2. Linting/formatting tool
	const codeQualityTool =
		argumentConfiguration.codeQualityTool ??
		(await orPrompt('--eslint+prettier/--biome', getCodeQualityTool));

	// 3. Tailwind support?
	const useTailwind =
		argumentConfiguration.useTailwind ??
		(await orPrompt('--tailwind/--no-tailwind', getUseTailwind));

	// 4. Frontend(s)
	const frontends =
		argumentConfiguration.frontends?.filter(
			(frontend) => frontend !== undefined
		) ?? (await orPrompt('--react/--vue/--svelte/…', getFrontends));

	// 5. HTML scripting option (if HTML was selected)
	const useHTMLScripts = frontends.includes('html')
		? (argumentConfiguration.useHTMLScripts ??
			(await orPrompt(
				'--html-scripts/--no-html-scripts',
				getHtmlScriptingOption
			)))
		: false;

	// 5b. Include example pages/components, or generate a bare skeleton
	const includeExamples =
		argumentConfiguration.includeExamples ??
		(await orPrompt('--examples/--no-examples', getIncludeExamples));

	// 6. Database engine
	const databaseEngine =
		argumentConfiguration.databaseEngine ??
		(await orPrompt('--db', getDatabaseEngine));

	// 7. Database host
	const databaseHost =
		argumentConfiguration.databaseHost ??
		(await orPrompt('--db-host', () => getDatabaseHost(databaseEngine)));

	// 8. ORM choice
	const orm =
		databaseEngine !== undefined && databaseEngine !== 'none'
			? (argumentConfiguration.orm ??
				(await orPrompt('--orm', () => getORM(databaseEngine))))
			: undefined;

	// 9. Configuration type
	let directoryConfig =
		argumentConfiguration.directoryConfig ??
		(await orPrompt('--directory', getConfigurationType));

	// 10. Directory configurations
	const { buildDirectory, assetsDirectory, tailwind, databaseDirectory } =
		await getDirectoryConfiguration({
			argumentConfiguration,
			databaseEngine,
			directoryConfig,
			useTailwind
		});

	// 11. Framework specific directories
	const frontendDirectories = await getFrontendDirectoryConfigurations(
		directoryConfig,
		frontends,
		argumentConfiguration.frontendDirectories
	);

	// If the user specified a custom directory configuration, we need to update the configuration type
	if (argumentConfiguration.frontendDirectories !== undefined)
		directoryConfig = 'custom';

	// 12. Auth provider
	const authOption =
		argumentConfiguration.authOption ??
		(await orPrompt('--auth', getAuthOption));

	// 12b. Agent-first action/auth/MCP/wallet/credential stack
	const agentic =
		argumentConfiguration.agentic ??
		(await orPrompt('--agentic/--no-agentic', getAgentic));

	// 13. Additional plugins
	const plugins =
		argumentConfiguration.plugins?.filter(
			(plugin) => plugin !== undefined
		) ?? (await orPrompt('--plugin', getPlugins));

	// 14. Initialize Git repository
	const initializeGitNow =
		argumentConfiguration.initializeGitNow ??
		(await orPrompt('--git/--no-git', getInitializeGit));

	// 14b. Optionally connect the new project to GitHub
	const resolveGithubLink = async () => {
		if (!initializeGitNow) {
			return {
				githubLink: 'skip' as const,
				githubRepoUrl: undefined,
				githubVisibility: undefined
			};
		}
		if (argumentConfiguration.githubLink) {
			return {
				githubLink: argumentConfiguration.githubLink,
				githubRepoUrl: argumentConfiguration.githubRepoUrl,
				githubVisibility: argumentConfiguration.githubVisibility
			};
		}

		return orPrompt('--repo/--repo-visibility', () =>
			getGithubLink(projectName)
		);
	};
	const { githubLink, githubRepoUrl, githubVisibility } =
		await resolveGithubLink();

	// 15. Install dependencies
	const installDependenciesNow =
		argumentConfiguration.installDependenciesNow ??
		(await orPrompt('--install/--no-install', getInstallDependencies));

	const values: CreateConfiguration = {
		agentic,
		absProviders: argumentConfiguration.absProviders?.filter(
			(provider) => provider !== undefined
		),
		assetsDirectory,
		authOption,
		buildDirectory,
		codeQualityTool,
		databaseDirectory,
		databaseEngine,
		databaseHost,
		directoryConfig,
		frontendDirectories,
		frontends,
		githubLink,
		githubRepoUrl,
		githubVisibility,
		includeExamples,
		initializeGitNow,
		installDependenciesNow,
		orm,
		plugins,
		projectName,
		tailwind,
		useHTMLScripts,
		useTailwind
	};

	return values;
};
