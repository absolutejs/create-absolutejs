import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { DEFAULT_ARG_LENGTH } from '../constants';
import {
	availableAuthProviders,
	availableCodeQualityTools,
	availableDatabaseEngines,
	availableDatabaseHosts,
	availableDirectoryConfigurations,
	availableHTMLScriptOptions,
	availableLanguages,
	availableORMs,
	availableFrontends
} from '../data';
import {
	isAuthProvider,
	isCodeQualityTool,
	isDatabaseEngine,
	isDatabaseHost,
	isDirectoryConfig,
	isFrontend,
	isHTMLScriptOption,
	isLanguage,
	isORM
} from '../typeGuards';
import type { ArgumentConfiguration, FrontendDirectories } from '../types';

export const parseCommandLineOptions = () => {
	const { values, positionals } = parseArgs({
		allowNegative: true,
		allowPositionals: true,
		args: argv.slice(DEFAULT_ARG_LENGTH),
		options: {
			angular: { type: 'string' },
			assets: { type: 'string' },
			auth: { type: 'string' },
			build: { type: 'string' },
			database: { type: 'string' },
			debug: { default: false, short: 'd', type: 'boolean' },
			directory: { type: 'string' },
			engine: { type: 'string' },
			frontend: { multiple: true, type: 'string' },
			git: { type: 'boolean' },
			help: { default: false, short: 'h', type: 'boolean' },
			host: { type: 'string' },
			html: { type: 'string' },
			htmx: { type: 'string' },
			lang: { type: 'string' },
			lts: { default: false, type: 'boolean' },
			npm: { type: 'boolean' },
			orm: { type: 'string' },
			plugin: { multiple: true, type: 'string' },
			quality: { type: 'string' },
			react: { type: 'string' },
			script: { type: 'string' },
			svelte: { type: 'string' },
			tailwind: { type: 'boolean' },
			'tailwind-input': { type: 'string' },
			'tailwind-output': { type: 'string' },
			vue: { type: 'string' }
		}
	});

	const errors: string[] = [];

	const authProvider = isAuthProvider(values.auth) ? values.auth : undefined;
	if (values.auth !== undefined && authProvider === undefined) {
		errors.push(
			`Invalid auth provider: "${values.auth}". Expected: [ ${availableAuthProviders.join(', ')} ]`
		);
	}

	const databaseEngine = isDatabaseEngine(values.engine)
		? values.engine
		: undefined;
	if (values.engine !== undefined && databaseEngine === undefined) {
		errors.push(
			`Invalid database engine: "${values.engine}". Expected: [ ${availableDatabaseEngines.join(', ')} ]`
		);
	}

	const databaseHost = isDatabaseHost(values.host) ? values.host : undefined;
	if (values.host !== undefined && databaseHost === undefined) {
		errors.push(
			`Invalid database host: "${values.host}". Expected: [ ${availableDatabaseHosts.join(', ')} ]`
		);
	}

	const orm = isORM(values.orm) ? values.orm : undefined;
	if (values.orm !== undefined && orm === undefined) {
		errors.push(
			`Invalid ORM: "${values.orm}". Expected: [ ${availableORMs.join(', ')} ]`
		);
	}

	const codeQualityTool = isCodeQualityTool(values.quality)
		? values.quality
		: undefined;
	if (values.quality !== undefined && codeQualityTool === undefined) {
		errors.push(
			`Invalid code quality tool: "${values.quality}". Expected: [ ${availableCodeQualityTools.join(', ')} ]`
		);
	}

	const htmlScriptOption = isHTMLScriptOption(values.script)
		? values.script
		: undefined;
	if (values.script !== undefined && htmlScriptOption === undefined) {
		errors.push(
			`Invalid HTML script option: "${values.script}". Expected: [ ${availableHTMLScriptOptions.join(', ')} ]`
		);
	}

	const language =
		values.lang !== undefined && isLanguage(values.lang)
			? values.lang
			: undefined;
	if (values.lang !== undefined && language === undefined) {
		errors.push(
			`Invalid language: "${values.lang}". Expected: [ ${availableLanguages.join(', ')} ]`
		);
	}

	const directoryConfig =
		values.directory !== undefined && isDirectoryConfig(values.directory)
			? values.directory
			: undefined;
	if (values.directory !== undefined && directoryConfig === undefined) {
		errors.push(
			`Invalid directory configuration: "${values.directory}". Expected: [ ${availableDirectoryConfigurations.join(', ')} ]`
		);
	}

	const invalidFrontends =
		values.frontend?.filter((f) => !isFrontend(f)) ?? [];
	invalidFrontends.forEach((f) => {
		errors.push(
			`Invalid frontend: "${f}". Expected: [ ${availableFrontends.join(', ')} ]`
		);
	});

	if (errors.length > 0) {
		console.error(errors.join('\n'));
		exit(1);
	}

	const frontendsWithDirectory = availableFrontends.filter(
		(f) => values[f] !== undefined
	);

	const frontendDirectories: FrontendDirectories = {};
	for (const frontend of frontendsWithDirectory) {
		frontendDirectories[frontend] = values[frontend]!;
	}

	const originalFrontends = values.frontend;
	const collector = new Set<string>(originalFrontends ?? []);

	for (const frontend of frontendsWithDirectory) {
		collector.add(frontend);
	}

	values.frontend = collector.size > 0 ? Array.from(collector) : undefined;

	const plugins =
		values.plugin && values.plugin[0] === 'none' ? [] : values.plugin;

	const argumentConfiguration: ArgumentConfiguration = {
		assetsDirectory: values.assets,
		authProvider,
		buildDirectory: values.build,
		codeQualityTool,
		databaseDirectory: values.database,
		databaseEngine,
		databaseHost,
		directoryConfig,
		frontendDirectories,
		frontends: values.frontend?.filter(isFrontend),
		htmlScriptOption,
		initializeGitNow: values.git,
		installDependenciesNow: values.npm,
		language,
		orm,
		plugins,
		projectName: positionals[0],
		tailwind:
			values['tailwind-input'] && values['tailwind-output']
				? {
						input: values['tailwind-input'],
						output: values['tailwind-output']
					}
				: undefined,
		useTailwind:
			values.tailwind ??
			(values['tailwind-input'] !== undefined &&
				values['tailwind-output'] !== undefined)
	};

	return {
		argumentConfiguration,
		debug: values.debug,
		help: values.help,
		latest: values.lts
	};
};
