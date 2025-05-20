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
import type { PromptResponse } from './types';

export const prompt = async () => {
	// 1. Project name
	const projectName = await getProjectName();

	// 2. Language
	const language = await getLanguage();

	// 3. Linting/formatting tool
	const codeQualityTool = await getCodeQualityTool();

	// 4. Tailwind support?
	const useTailwind = await getUseTailwind();

	// 5. Frontend(s)
	const frontends = await getFrontends();

	// 6. HTML scripting option (if HTML was selected)
	const htmlScriptOption = frontends.includes('html')
		? await getHtmlScriptingOption(language)
		: undefined;

	// 7. Database engine
	const databaseEngine = await getDatabaseEngine();

	// 8. Database host
	const databaseHost = await getDatabaseHost(databaseEngine);

	// 9. ORM choice
	const orm = databaseEngine !== undefined ? await getORM() : undefined;

	// 10. Configuration type
	const configType = await getConfigurationType();

	// 11. Directory configurations
	const { buildDirectory, assetsDirectory, tailwind, databaseDirectory } =
		await getDirectoryConfiguration({
			configType,
			databaseEngine,
			useTailwind
		});

	// 12. Framework-specific directories
	const frontendConfigurations = await getFrontendDirectoryConfigurations(
		configType,
		frontends
	);

	// 13. Auth provider
	const authProvider = await getAuthProvider();

	// 14. Additional plugins
	const plugins = await getPlugins();

	// 15. Initialize Git repository
	const initializeGitNow = await getInitializeGit();

	// 16. Install dependencies
	const installDependenciesNow = await getInstallDependencies();

	const values: PromptResponse = {
		assetsDirectory,
		authProvider,
		buildDirectory,
		codeQualityTool,
		configType,
		databaseDirectory,
		databaseEngine,
		databaseHost,
		frontendConfigurations,
		frontends, // @ts-expect-error //TODO: The script comes back as a string and needs to be verified as a specific string beforehand in the function
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
