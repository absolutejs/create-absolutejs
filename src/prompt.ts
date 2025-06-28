import { getAuthProvider } from './questions/authProvider';
import { getCodeQualityTool } from './questions/codeQualityTool';
import { getConfigurationType } from './questions/configurationType';
import { getDatabaseEngine } from './questions/databaseEngine';
import { getDatabaseHost } from './questions/databaseHost';
import { getDirectoryConfiguration } from './questions/directoryConfiguration';
import { getFrontendDirectoryConfigurations } from './questions/frontendDirectoryConfigurations';
import { getFrontends } from './questions/frontends';
import { getHtmlScriptingOption } from './questions/htmlScriptingOption';
import { getInitializeGit } from './questions/initializeGitNow';
import { getInstallDependencies } from './questions/installDependenciesNow';
import { getLanguage } from './questions/language';
import { getORM } from './questions/orm';
import { getPlugins } from './questions/plugins';
import { getProjectName } from './questions/projectName';
import { getUseTailwind } from './questions/useTailwind';
import type { ArgumentConfiguration, CreateConfiguration } from './types';

export const prompt = async (argumentConfiguration: ArgumentConfiguration) => {
	// 1. Project name
	const projectName =
		argumentConfiguration.projectName ?? (await getProjectName());

	// 2. Language
	const language = argumentConfiguration.language ?? (await getLanguage());

	// 3. Linting/formatting tool
	const codeQualityTool =
		argumentConfiguration.codeQualityTool ?? (await getCodeQualityTool());

	// 4. Tailwind support?
	const useTailwind =
		argumentConfiguration.useTailwind ?? (await getUseTailwind());

	// 5. Frontend(s)
	const frontends =
		argumentConfiguration.frontends?.filter(
			(frontend) => frontend !== undefined
		) ?? (await getFrontends());

	// 6. HTML scripting option (if HTML was selected)
	const htmlScriptOption =
		!frontends.includes('html') ||
		argumentConfiguration.htmlScriptOption === 'none'
			? undefined
			: (argumentConfiguration.htmlScriptOption ??
				(await getHtmlScriptingOption(language)));

	// 7. Database engine
	const databaseEngine =
		argumentConfiguration.databaseEngine ?? (await getDatabaseEngine());

	// 8. Database host
	const databaseHost =
		argumentConfiguration.databaseHost ??
		(await getDatabaseHost(databaseEngine));

	// 9. ORM choice
	const orm =
		databaseEngine !== undefined && databaseEngine !== 'none'
			? (argumentConfiguration.orm ?? (await getORM()))
			: undefined;

	// 10. Configuration type
	let directoryConfig =
		argumentConfiguration.directoryConfig ?? (await getConfigurationType());

	// 11. Directory configurations
	const { buildDirectory, assetsDirectory, tailwind, databaseDirectory } =
		await getDirectoryConfiguration({
			argumentConfiguration,
			databaseEngine,
			directoryConfig,
			useTailwind
		});

	// 12. Framework-specific directories
	const frontendDirectories = await getFrontendDirectoryConfigurations(
		directoryConfig,
		frontends,
		argumentConfiguration.frontendDirectories
	);

	// If the user specified a custom directory configuration, we need to update the configuration type
	if (argumentConfiguration.frontendDirectories !== undefined)
		directoryConfig = 'custom';

	// 13. Auth provider
	const authProvider =
		argumentConfiguration.authProvider ?? (await getAuthProvider());

	// 14. Additional plugins
	const plugins =
		argumentConfiguration.plugins?.filter(
			(plugin) => plugin !== undefined
		) ?? (await getPlugins());

	// 15. Initialize Git repository
	const initializeGitNow =
		argumentConfiguration.initializeGitNow ?? (await getInitializeGit());

	// 16. Install dependencies
	const installDependenciesNow =
		argumentConfiguration.installDependenciesNow ??
		(await getInstallDependencies());

	const values: CreateConfiguration = {
		assetsDirectory,
		authProvider,
		buildDirectory,
		codeQualityTool,
		databaseDirectory,
		databaseEngine,
		databaseHost,
		directoryConfig,
		frontendDirectories,
		frontends,
		htmlScriptOption,
		initializeGitNow,
		installDependenciesNow,
		language,
		orm,
		plugins,
		projectName,
		tailwind,
		useTailwind
	};

	return values;
};
