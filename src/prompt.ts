import { getAuthProvider } from './questions/authProvider';
import { getCodeQualityTool } from './questions/codeQualityTool';
import { getConfigurationType } from './questions/configurationType';
import { getDatabaseDialect } from './questions/databaseDialect';
import { getDirectoryConfiguration } from './questions/directoryConfiguration';
import { getFrontendDirectoryConfigurations } from './questions/frontendDirectoryConfigurations';
import { getFrontends } from './questions/frontends';
import { getHtmlScriptingOption } from './questions/htmlScriptingOption';
import { getInitializeGit } from './questions/initializeGit';
import { getInstallDependencies } from './questions/installDependencies';
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

	// 7. Configuration type
	const configType = await getConfigurationType();

	// 8. Directory configurations
	const { buildDir, assetsDir, tailwind } = await getDirectoryConfiguration(
		configType,
		useTailwind
	);

	// 9. Framework-specific directories
	const frontendConfigurations = await getFrontendDirectoryConfigurations(
		configType,
		frontends
	);

	// 10. Database provider
	const databaseDialect = await getDatabaseDialect();

	// 11. ORM choice (optional)
	const orm = databaseDialect !== undefined ? await getORM() : undefined;

	// 12. Auth provider
	const authProvider = await getAuthProvider();

	// 13. Additional plugins (optional)
	const plugins = await getPlugins();

	// 14. Initialize Git repository
	const initializeGit = await getInitializeGit();

	// 15. Install dependencies
	const installDependencies = await getInstallDependencies();

	const values: PromptResponse = {
		assetsDir,
		authProvider,
		buildDir,
		codeQualityTool,
		configType,
		databaseDialect,
		frontendConfigurations,
		frontends,
		// @ts-expect-error //TODO: The script comes back as a string and needs to be verified as a specific string beforehand in the function
		htmlScriptOption,
		initializeGit,
		installDependencies,
		language,
		orm,
		plugins,
		projectName,
		tailwind,
		useTailwind
	};

	return values;
};
