import { blueBright, cyan, dim, green, magenta, red, yellow } from 'picocolors';
import type { FrontendFramework, PromptResponse } from './types';

export const helpMessage = `
Usage: create-absolute [options] [dir]

Arguments:
    dir             The name of the created application. 
                    If not specified, the user will be prompted during creation.

Options:
    -h, --help      Show this help message and exit
    -s, --summary   Show a summary of the project configuration after creation
`;

type DebugMessageProps = {
	response: PromptResponse;
	packageManager: string;
	availableFrontends: Record<string, FrontendFramework>;
};

export const getSummaryMessage = ({
	response: {
		projectName,
		language,
		codeQualityTool,
		tailwind,
		frontends,
		buildDir,
		assetsDir,
		dbProvider,
		orm,
		authProvider,
		plugins,
		initializeGit,
		installDeps,
		htmlScriptOption,
		frontendConfigurations
	},
	packageManager,
	availableFrontends
}: DebugMessageProps) => {
	const htmlLabels: Record<'ssr' | 'script', string> = {
		script:
			language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript'),
		ssr:
			language === 'ts'
				? blueBright('TypeScript + SSR')
				: yellow('JavaScript + SSR')
	};

	let htmlScriptingValue = 'None';
	if (htmlScriptOption === 'ssr') {
		htmlScriptingValue = htmlLabels.ssr;
	} else if (htmlScriptOption === 'script') {
		htmlScriptingValue = htmlLabels.script;
	}

	const htmlScriptingLine = frontends.includes('html')
		? `\n${magenta('HTML Scripting')}:   	${htmlScriptingValue}`
		: '';

	const frontendLabels = frontends.map(
		(name) => availableFrontends[name]?.label ?? name
	);
	const frontendHeading =
		frontends.length === 1 ? magenta('Frontend') : magenta('Frontends');

	const configString = frontendConfigurations.reduce(
		(accumulator, { name, directory }, idx, arr) => {
			const label = availableFrontends[name]?.label ?? name;
			const segment = `${label}:		${directory}${
				idx < arr.length - 1 ? '\n    ' : ''
			}`;

			return accumulator + segment;
		},
		''
	);

	const tailwindSection = tailwind
		? `\n    ${cyan('Input')}:          	${tailwind.input}\n    ${cyan('Output')}:         	${tailwind.output}`
		: dim('None');

	return `
${magenta('Project Name')}:       	${projectName}
${magenta('Package Manager')}:    	${packageManager}
${magenta('Language')}:           	${language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript')}
${magenta('Linting')}:            	${codeQualityTool === 'eslint+prettier' ? 'ESLint + Prettier' : 'Biome'}
${magenta('Tailwind')}:           	${tailwindSection}
${frontendHeading}:           	${frontendLabels.join(', ')}${htmlScriptingLine}
${magenta('Build Directory')}:    	${buildDir}
${magenta('Assets Directory')}:   	${assetsDir}
${magenta('Database')}:           	${dbProvider === 'none' ? dim('None') : dbProvider}
${magenta('ORM')}:                	${orm ?? dim('None')}
${magenta('Auth')}:               	${authProvider === 'none' ? dim('None') : authProvider}
${magenta('Plugins')}:            	${plugins.length ? plugins.join(', ') : dim('None')}
${magenta('Git Repository')}:     	${initializeGit ? green('Initialized') : dim('None')}
${magenta('Install Dependencies')}:   ${installDeps ? green('Yes') : red('No')}
${magenta('Framework Config')}:
    ${configString}`;
};
