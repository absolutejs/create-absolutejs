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
import { getORM } from './questions/orm';
import { getPlugins } from './questions/plugins';
import { getProjectName } from './questions/projectName';
import { getUseTailwind } from './questions/useTailwind';
import type { ArgumentConfiguration, CreateConfiguration } from './types';

export const prompt = async (argumentConfiguration: ArgumentConfiguration) => {
	// 1. Project name
	const projectName =
		argumentConfiguration.projectName ?? (await getProjectName());

	// 2. Linting/formatting tool
	const codeQualityTool =
		argumentConfiguration.codeQualityTool ?? (await getCodeQualityTool());

	// 3. Tailwind support?
	const useTailwind =
		argumentConfiguration.useTailwind ?? (await getUseTailwind());

	// 4. Frontend(s)
	const frontends =
		argumentConfiguration.frontends?.filter(
			(frontend) => frontend !== undefined
		) ?? (await getFrontends());

	// 5. HTML scripting option (if HTML was selected)
	const useHTMLScripts =
		!frontends.includes('html') ||
		argumentConfiguration.useHTMLScripts === undefined
			? false
			: (argumentConfiguration.useHTMLScripts ??
				(await getHtmlScriptingOption()));

	// 6. Database engine
	const databaseEngine =
		argumentConfiguration.databaseEngine ?? (await getDatabaseEngine());

	// 7. Database host
	const databaseHost =
		argumentConfiguration.databaseHost ??
		(await getDatabaseHost(databaseEngine));

	// 8. ORM choice
	const orm =
		databaseEngine !== undefined && databaseEngine !== 'none'
			? (argumentConfiguration.orm ?? (await getORM()))
			: undefined;

	// 9. Configuration type
	let directoryConfig =
		argumentConfiguration.directoryConfig ?? (await getConfigurationType());

	// 10. Directory configurations
	const { buildDirectory, assetsDirectory, tailwind, databaseDirectory } =
		await getDirectoryConfiguration({
			argumentConfiguration,
			databaseEngine,
			directoryConfig,
			useTailwind
		});

	// 11. Framework-specific directories
	const frontendDirectories = await getFrontendDirectoryConfigurations(
		directoryConfig,
		frontends,
		argumentConfiguration.frontendDirectories
	);

	// If the user specified a custom directory configuration, we need to update the configuration type
	if (argumentConfiguration.frontendDirectories !== undefined)
		directoryConfig = 'custom';

	// 12. Auth provider
	const authProvider =
		argumentConfiguration.authProvider ?? (await getAuthProvider());

	// 13. Additional plugins
	const plugins =
		argumentConfiguration.plugins?.filter(
			(plugin) => plugin !== undefined
		) ?? (await getPlugins());

	// 14. Initialize Git repository
	const initializeGitNow =
		argumentConfiguration.initializeGitNow ?? (await getInitializeGit());

	// 15. Install dependencies
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
