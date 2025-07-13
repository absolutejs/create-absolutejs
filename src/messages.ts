import { blueBright, cyan, dim, green, magenta, red } from 'picocolors';
import { frontendLabels } from './data';
import type { CreateConfiguration } from './types';

export const helpMessage = `
Usage: create-absolute [options] [${magenta('project-name')}]

Arguments:
  ${magenta('project-name')}                    Name of the application to create.
                                  If omitted, you'll be prompted to enter one.

Options:
  ${cyan('--help, -h')}                      Show this help message and exit
  ${cyan('--debug, -d')}                     Display a summary of the project configuration after creation

  ${cyan('--angular')}                       Include an Angular frontend
  ${cyan('--angular-dir')} ${dim(cyan('<dir>'))}             Specify the directory for and use the Angular frontend
  ${cyan('--assets')} ${dim(cyan('<dir>'))}                  Directory name for your static assets
  ${cyan('--auth')} ${dim(cyan('<plugin>'))}                 Pre-configured auth plugin (currently only "absolute-auth") or 'none'
  ${cyan('--biome')}                         Use Biome for code quality and formatting
  ${cyan('--build')} ${dim(cyan('<dir>'))}                   Output directory for build artifacts
  ${cyan('--database')} ${dim(cyan('<dir>'))}                Directory name for your database files
  ${cyan('--directory')} ${dim(cyan('<mode>'))}              Directory-naming strategy: "default" or "custom"
  ${cyan('--engine')} ${dim(cyan('<engine>'))}               Database engine (postgresql | mysql | sqlite | mongodb | redis | singlestore | cockroachdb | mssql) or 'none'
  ${cyan('--eslint+prettier')}                   Use ESLint + Prettier for code quality and formatting
  ${cyan('--git')}                           Initialize a Git repository
  ${cyan('--host')} ${dim(cyan('<host>'))}                   Database host provider (neon | planetscale | supabase | turso | vercel | upstash | atlas) or 'none'
  ${cyan('--html')}                          Include a plain HTML frontend
  ${cyan('--html-dir')} ${dim(cyan('<dir>'))}                Specify the directory for and use the HTML frontend
  ${cyan('--html-scripts')}                   Enable HTML scripting with TypeScript
  ${cyan('--htmx')}                          Include an HTMX frontend
  ${cyan('--htmx-dir')} ${dim(cyan('<dir>'))}                Specify the directory for and use the HTMX frontend
  ${cyan('--install')}                       Use the same package manager to install dependencies
  ${cyan('--lts')}                           Use LTS versions of required packages
  ${cyan('--orm')} ${dim(cyan('<orm>'))}                     ORM to configure: "drizzle" | "prisma" | 'none'
  ${cyan('--plugin')} ${dim(cyan('<plugin>'))}               Elysia plugin(s) to include (repeatable); 'none' skips plugin setup
  ${cyan('--react')}                         Include a React frontend
  ${cyan('--react-dir')} ${dim(cyan('<dir>'))}               Specify the directory for and use the React frontend
  ${cyan('--skip')}                          Skip non-required prompts; uses 'none' for all optional configs
  ${cyan('--svelte')}                        Include a Svelte frontend
  ${cyan('--svelte-dir')} ${dim(cyan('<dir>'))}              Specify the directory for and use the Svelte frontend
  ${cyan('--tailwind')}                      Include Tailwind CSS setup
  ${cyan('--tailwind-input')} ${dim(cyan('<file>'))}         Path to your Tailwind CSS entry file
  ${cyan('--tailwind-output')} ${dim(cyan('<file>'))}        Path for the generated Tailwind CSS bundle
  ${cyan('--vue')}                           Include a Vue frontend
  ${cyan('--vue-dir')} ${dim(cyan('<dir>'))}                 Specify the directory for and use the Vue frontend
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
	`${installDependenciesNow ? '' : `${cyan(`${packageManager} install`)}\n`}` +
	`${cyan(`${packageManager} dev`)}`; // TODO: Some package managers need run

type DebugMessageProps = {
	response: CreateConfiguration;
	packageManager: string;
};

export const getDebugMessage = ({
	response: {
		projectName,
		codeQualityTool,
		directoryConfig,
		useTailwind,
		tailwind,
		frontends,
		useHTMLScripts,
		frontendDirectories,
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
	packageManager
}: DebugMessageProps) => {
	const htmlScriptingValue = useHTMLScripts
		? blueBright('TypeScript')
		: dim('None');

	const frameworkConfig = frontends
		.map(
			(name) =>
				`${frontendLabels[name]}: src/frontend/${frontendDirectories[name]}`
		)
		.join('\n    ');

	const tailwindSection =
		useTailwind && tailwind
			? `Input:  ${tailwind.input}\nOutput: ${tailwind.output}`
			: dim('None');

	const isCustomConfig = directoryConfig === 'custom';

	/* prettier-ignore */
	const lines: [string, string][] = [
		['Project Name',         projectName],
		['Package Manager',      packageManager],
		['Config Type',          isCustomConfig ? green('Custom') : dim('Default')],
		['Linting',              codeQualityTool === 'eslint+prettier' ? 'ESLint + Prettier' : 'Biome'],
		['Tailwind Configuration', tailwindSection],
		[frontends.length === 1 ? 'Frontend' : 'Frontends', frontends.map((name) => frontendLabels[name]).join(', ')],
		['HTML Scripting',       frontends.includes('html') ? htmlScriptingValue : dim('None')],
		['Build Directory',      buildDirectory],
		['Assets Directory',     assetsDirectory],
		['Database Engine',      databaseEngine && databaseEngine !== 'none' ? databaseEngine : dim('None')],
		['Database Host',        databaseHost && databaseHost !== 'none' ? databaseHost : dim('None')],
		['Database Directory',   databaseDirectory ?? dim('None')],
		['ORM',                  orm ?? dim('None')],
		['Auth Provider',        authProvider && authProvider !== 'none' ? authProvider : dim('None')],
		['Plugins',              plugins.length && !plugins.includes('none') ? plugins.join(', ') : dim('None')],
		['Initialize Git',       initializeGitNow ? green('Yes') : red('No')],
		['Install Dependencies', installDependenciesNow ? green('Yes') : red('No')],
		['Framework Config',     frameworkConfig]
	];

	const maxLabelLength = Math.max(...lines.map(([label]) => label.length));

	const body = `\n\n${lines
		.map(([label, value]) => {
			const gap = ' '.repeat(maxLabelLength - label.length);

			return `${magenta(label)}:${gap} ${value}`;
		})
		.join('\n')}`;

	return body;
};
