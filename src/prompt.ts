import { getAuthProvider } from './questions/authProvider';
import { getCodeQualityTool } from './questions/codeQualityTool';
import { getConfigurationType } from './questions/configurationType';
import { getDatabaseDialect } from './questions/databaseDialect';
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

	// 7. Database provider
	const databaseDialect = await getDatabaseDialect();

	// 8. ORM choice (optional)
	const orm = databaseDialect !== undefined ? await getORM() : undefined;

	// 9. Configuration type
	const configType = await getConfigurationType();

	// 10. Directory configurations
	const { buildDirectory, assetsDirectory, tailwind, databaseDirectory } =
		await getDirectoryConfiguration({
			configType,
			databaseDialect,
			useTailwind
		});

	// 11. Framework-specific directories
	const frontendConfigurations = await getFrontendDirectoryConfigurations(
		configType,
		frontends
	);

	// 12. Auth provider
	const authProvider = await getAuthProvider();

	// 13. Additional plugins (optional)
	const plugins = await getPlugins();

	// 14. Initialize Git repository
	const initializeGitNow = await getInitializeGit();

	// 15. Install dependencies
	const installDependenciesNow = await getInstallDependencies();

	const values: PromptResponse = {
		assetsDirectory,
		authProvider,
		buildDirectory,
		codeQualityTool,
		configType,
		databaseDialect,
		databaseDirectory,
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
