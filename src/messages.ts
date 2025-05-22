import { blueBright, cyan, dim, green, magenta, red, yellow } from 'picocolors';
import type {
	FrontendFramework,
	HTMLScriptOption,
	PromptResponse
} from './types';

export const helpMessage = `
Usage: create-absolute [options] [dir]

Arguments:
    dir             The name of the created application. 
                    If not specified, the user will be prompted during creation.

Options:
    -h, --help      Show this help message and exit
    -d, --debug     Show a summary of the project configuration after creation
	-l, --latest    Fetch and use the latest version of required packages
`;

type OutroMessageProps = {
	projectName: string;
	packageManager: string;
	installDependenciesNow: boolean;
};

export const getOutroMessage = ({
	projectName,
	packageManager,
	installDependenciesNow
}: OutroMessageProps) =>
	`${green('Created successfully')}, you can now run:\n\n` +
	`${cyan('cd')} ${projectName}\n` +
	`${cyan(`${packageManager} dev`)}${
		installDependenciesNow ? '' : `\n${cyan(`${packageManager} install`)}`
	}`;

type DebugMessageProps = {
	response: PromptResponse;
	packageManager: string;
	availableFrontends: Record<string, FrontendFramework>;
};

export const getDebugMessage = ({
	response: {
		projectName,
		language,
		codeQualityTool,
		configType,
		useTailwind,
		tailwind,
		frontends,
		htmlScriptOption,
		frontendConfigurations,
		buildDirectory,
		assetsDirectory,
		databaseEngine,
		databaseHost,
		databaseDirectory,
		orm,
		authProvider,
		plugins,
		initializeGitNow,
		installDependenciesNow
	},
	packageManager,
	availableFrontends
}: DebugMessageProps) => {
	const htmlLabels: Record<Exclude<HTMLScriptOption, undefined>, string> = {
		js: yellow('JavaScript'),
		'js+ssr': yellow('JavaScript + SSR'),
		ts: blueBright('TypeScript'),
		'ts+ssr': blueBright('TypeScript + SSR')
	};

	const htmlScriptingValue =
		htmlScriptOption !== undefined
			? htmlLabels[htmlScriptOption]
			: dim('None');

	const htmlScriptingLine = frontends.includes('html')
		? `\n${magenta('HTML Scripting')}:   	${htmlScriptingValue}`
		: '';

	const frontendLabels = frontends.map(
		(name) => availableFrontends[name]?.label ?? name
	);
	const frontendHeading =
		frontends.length === 1 ? magenta('Frontend') : magenta('Frontends');

	const configString = frontendConfigurations.reduce(
		(acc, { name, directory }, idx, arr) => {
			const label = availableFrontends[name]?.label ?? name;
			const segment = `${label}:		src/frontend/${directory}${
				idx < arr.length - 1 ? '\n    ' : ''
			}`;

			return acc + segment;
		},
		''
	);

	const tailwindSection =
		tailwind && useTailwind
			? `\n    ${cyan('Input')}:          	${tailwind.input}\n    ${cyan('Output')}:         	${tailwind.output}`
			: dim('None');

	return `
${magenta('Project Name')}:       	${projectName}
${magenta('Package Manager')}:    	${packageManager}
${magenta('Config Type')}:        	${configType === 'custom' ? green('Custom') : dim('Default')}
${magenta('Language')}:           	${language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript')}
${magenta('Linting')}:            	${codeQualityTool === 'eslint+prettier' ? 'ESLint + Prettier' : 'Biome'}
${magenta('Tailwind Configuration')}:    	${tailwindSection}
${frontendHeading}:           	${frontendLabels.join(', ')}${htmlScriptingLine}
${magenta('Build Directory')}:    	${buildDirectory}
${magenta('Assets Directory')}:   	${assetsDirectory}
${magenta('Database Engine')}:    	${databaseEngine ?? dim('None')}
${magenta('Database Host')}:      	${databaseHost ?? dim('None')}
${magenta('Database Directory')}:       	${databaseDirectory ?? dim('None')}
${magenta('ORM')}:                	${orm ?? dim('None')}
${magenta('Authorization Provider')}:               	${authProvider ?? dim('None')}
${magenta('Plugins')}:            	${plugins.length ? plugins.join(', ') : dim('None')}
${magenta('Initialize Git')}:     	${initializeGitNow ? green('Yes') : dim('No')}
${magenta('Install Dependencies')}:	${installDependenciesNow ? green('Yes') : red('No')}
${magenta('Framework Config')}:
    ${configString}\n\n`;
};
