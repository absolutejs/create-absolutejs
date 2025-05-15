import { dim, green, red } from 'picocolors';
import type { FrontendFramework, PromptResponse } from './types';

export const helpMessage = `
Usage: create-absolute [options] [dir]

Arguments:
    dir             The name of the created application. 
                    If not specified, the user will be prompted during creation.

Options:
    -h, --help      Show this help message and exit
    -d, --debug     Show debug information after the prompt
`;

type DebugMessageProps = {
	response: PromptResponse;
	packageManager: string;
	availableFrontends: Record<string, FrontendFramework>;
};

export const debugMessage = ({
	response: {
		projectName,
		language,
		codeQualityTool,
		tailwind,
		frameworks,
		buildDir,
		assetsDir,
		dbProvider,
		orm,
		authProvider,
		plugins,
		initializeGit,
		installDeps,
		htmlScriptOption,
		frameworkConfigurations
	},
	packageManager,
	availableFrontends
}: DebugMessageProps) => {
	// map HTML options to labels
	const htmlLabels: Record<'ssr' | 'script', string> = {
		script: language === 'ts' ? 'TypeScript' : 'JavaScript',
		ssr: language === 'ts' ? 'TypeScript + SSR' : 'JavaScript + SSR'
	};

	// determine the HTML scripting value in a flat if‐else (no nested blocks)
	let htmlScriptingValue = 'None';
	if (htmlScriptOption === 'ssr') {
		htmlScriptingValue = htmlLabels.ssr;
	} else if (htmlScriptOption === 'script') {
		htmlScriptingValue = htmlLabels.script;
	}

	// only show the line if "html" is among the chosen frameworks
	const htmlScriptingLine = frameworks.includes('html')
		? `\nHTML Scripting:   ${htmlScriptingValue}`
		: '';

	return `
Project Name:     ${projectName}
Package Manager:  ${packageManager}
Language:         ${language === 'ts' ? 'TypeScript' : 'JavaScript'}
Linting:          ${codeQualityTool === 'eslint+prettier' ? 'ESLint + Prettier' : 'Biome'}
Tailwind:         ${tailwind ? `input: ${tailwind.input}, output: ${tailwind.output}` : 'None'}
Framework(s):     ${frameworks.join(', ')}${htmlScriptingLine}
Build Directory:  ${buildDir}
Assets Directory: ${assetsDir}
Database:         ${dbProvider === 'none' ? dim('None') : dbProvider}
ORM:              ${orm ?? dim('None')}
Auth:             ${authProvider === 'none' ? dim('None') : authProvider}
Plugins:          ${plugins.length ? plugins.join(', ') : dim('None')}
Git Repository:   ${initializeGit ? 'Initialized' : dim('None')}
Install Deps:     ${installDeps ? green('Yes') : red('No')}

Framework Config:
${frameworkConfigurations
	.map(
		({ framework, pages, index }) =>
			`${availableFrontends[framework]?.label ?? framework} ⇒ pages: ${pages}, index: ${index}`
	)
	.join('\n    ')}
`;
};
