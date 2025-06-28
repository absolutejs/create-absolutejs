import { blueBright, cyan, dim, green, magenta, red, yellow } from 'picocolors';
import { frontendLabels } from './data';
import type { HTMLScriptOption, CreateConfiguration } from './types';

export const helpMessage = `
Usage: create-absolute [options] [${magenta('project-name')}]

Arguments:
  ${magenta('project-name')}                    Name of the application to create.
                                  If omitted, you'll be prompted to enter one.

Options:
  ${cyan('--help, -h')}                      Show this help message and exit
  ${cyan('--debug, -d')}                     Display a summary of the project configuration after creation

  ${cyan('--angular')} ${dim(cyan('<dir>'))}                 Directory name for an Angular frontend
  ${cyan('--assets')} ${dim(cyan('<dir>'))}                  Directory name for your static assets
  ${cyan('--auth')} ${dim(cyan('<plugin>'))}                 Preconfigured auth plugin (currently only "absolute-auth") or 'none' to skip auth setup
  ${cyan('--build')} ${dim(cyan('<dir>'))}                   Output directory for build artifacts
  ${cyan('--database')} ${dim(cyan('<dir>'))}                Directory name for your database files
  ${cyan('--directory')} ${dim(cyan('<mode>'))}              Directory-naming strategy: "default" or "custom"
  ${cyan('--engine')} ${dim(cyan('<engine>'))}               Database engine (postgresql | mysql | sqlite | mongodb | redis | singlestore | cockroachdb | mssql) or 'none' to skip database setup
  ${cyan('--frontend')} ${dim(cyan('<name>'))}               Frontend framework(s) to include: one or more of "react", "svelte", "html", "htmx", "vue", "angular"
  ${cyan('--git')}                           Initialize a Git repository
  ${cyan('--host')} ${dim(cyan('<host>'))}                   Database host provider (neon | planetscale | supabase | turso | vercel | upstash | atlas) or 'none' to skip database host setup
  ${cyan('--html')} ${dim(cyan('<dir>'))}                    Directory name for an HTML frontend
  ${cyan('--htmx')} ${dim(cyan('<dir>'))}                    Directory name for an HTMX frontend
  ${cyan('--lang')} ${dim(cyan('<lang>'))}                   Language: "ts" or "js"
  ${cyan('--lts')}                           Use LTS versions of required packages
  ${cyan('--npm')}                           Use the package manager that invoked this command to install dependencies
  ${cyan('--orm')} ${dim(cyan('<orm>'))}                     ORM to configure: "drizzle" or "prisma" or 'none' to skip ORM setup
  ${cyan('--plugin')} ${dim(cyan('<plugin>'))}               Elysia plugin(s) to include (can be specified multiple times), passing 'none' will skip plugin setup and ignore any other plugin options
  ${cyan('--quality')} ${dim(cyan('<tool>'))}                Code quality tool: "eslint+prettier" or "biome"
  ${cyan('--react')} ${dim(cyan('<dir>'))}                   Directory name for a React frontend
  ${cyan('--script')} ${dim(cyan('<option>'))}               HTML scripting option: "ts" | "js" | "ts+ssr" | "js+ssr"
  ${cyan('--skip')}                          Skips non required prompts and uses 'none' for all optional configurations
  ${cyan('--svelte')} ${dim(cyan('<dir>'))}                  Directory name for a Svelte frontend
  ${cyan('--tailwind')}                      Include Tailwind CSS setup
  ${cyan('--tailwind-input')} ${dim(cyan('<file>'))}         Path to your Tailwind CSS entry file
  ${cyan('--tailwind-output')} ${dim(cyan('<file>'))}        Path for the generated Tailwind CSS bundle
  ${cyan('--vue')} ${dim(cyan('<dir>'))}                     Directory name for a Vue frontend
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
		language,
		codeQualityTool,
		directoryConfig,
		useTailwind,
		tailwind,
		frontends,
		htmlScriptOption,
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
	const htmlLabels: Record<Exclude<HTMLScriptOption, undefined>, string> = {
		js: yellow('JavaScript'),
		'js+ssr': yellow('JavaScript + SSR'),
		none: dim('None'),
		ts: blueBright('TypeScript'),
		'ts+ssr': blueBright('TypeScript + SSR')
	};
	const htmlScriptingValue = htmlScriptOption
		? htmlLabels[htmlScriptOption]
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
		['Language',             language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript')],
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
