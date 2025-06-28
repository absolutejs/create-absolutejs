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
import type {
	ArgumentConfiguration,
	AuthProvider,
	DatabaseEngine,
	DatabaseHost,
	FrontendDirectories,
	HTMLScriptOption,
	ORM
} from '../types';

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
			skip: { type: 'boolean' },
			svelte: { type: 'string' },
			tailwind: { type: 'boolean' },
			'tailwind-input': { type: 'string' },
			'tailwind-output': { type: 'string' },
			vue: { type: 'string' }
		}
	});

	const errors: string[] = [];

	let authProvider: AuthProvider;
	if (values.auth !== undefined && !isAuthProvider(values.auth)) {
		errors.push(
			`Invalid auth provider: "${values.auth}". Expected: [ ${availableAuthProviders.join(', ')} ]`
		);
	} else if (values.auth !== undefined) {
		authProvider = values.auth;
	} else if (values.skip) {
		authProvider = 'none';
	}

	let databaseEngine: DatabaseEngine;
	if (values.engine !== undefined && !isDatabaseEngine(values.engine)) {
		errors.push(
			`Invalid database engine: "${values.engine}". Expected: [ ${availableDatabaseEngines.join(', ')} ]`
		);
	} else if (values.engine !== undefined) {
		databaseEngine = values.engine;
	} else if (values.skip) {
		databaseEngine = 'none';
	}

	let databaseHost: DatabaseHost;
	if (values.host !== undefined && !isDatabaseHost(values.host)) {
		errors.push(
			`Invalid database host: "${values.host}". Expected: [ ${availableDatabaseHosts.join(', ')} ]`
		);
	} else if (values.host !== undefined) {
		databaseHost = values.host;
	} else if (values.skip) {
		databaseHost = 'none';
	}

	const { orm: ormValue } = values;
	let orm: ORM;
	if (ormValue !== undefined && !isORM(ormValue)) {
		errors.push(
			`Invalid ORM: "${values.orm}". Expected: [ ${availableORMs.join(', ')} ]`
		);
	} else if (ormValue !== undefined) {
		orm = ormValue;
	} else if (values.skip) {
		orm = 'none';
	}

	const codeQualityTool = isCodeQualityTool(values.quality)
		? values.quality
		: undefined;
	if (values.quality !== undefined && codeQualityTool === undefined) {
		errors.push(
			`Invalid code quality tool: "${values.quality}". Expected: [ ${availableCodeQualityTools.join(', ')} ]`
		);
	}

	let htmlScriptOption: HTMLScriptOption;
	if (values.script !== undefined && !isHTMLScriptOption(values.script)) {
		errors.push(
			`Invalid HTML script option: "${values.script}". Expected: [ ${availableHTMLScriptOptions.join(', ')} ]`
		);
	} else if (values.script !== undefined) {
		htmlScriptOption = values.script;
	} else if (values.skip) {
		htmlScriptOption = 'none';
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

	for (const f of values.frontend || []) {
		if (isFrontend(f)) continue;
		errors.push(
			`Invalid frontend: "${f}". Expected: [ ${availableFrontends.join(', ')} ]`
		);
	}

	if (errors.length > 0) {
		console.error(errors.join('\n'));
		exit(1);
	}

	if (databaseEngine === 'none' && databaseHost !== 'none') {
		console.warn(
			'Warning: Setting the database host without a database engine has no effect.'
		);
	}

	if (databaseEngine === 'none' && orm !== 'none') {
		console.warn(
			'Warning: Setting an ORM without a database engine has no effect.'
		);
	}

	let databaseDirectory = values.database;
	if (databaseEngine === 'none' && databaseDirectory !== undefined) {
		console.warn(
			'Warning: Setting a database directory without a database engine has no effect.'
		);
		databaseDirectory = undefined;
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

	if (values.plugin === undefined && values.skip) {
		values.plugin = ['none'];
	}
	const plugins =
		values.plugin && values.plugin[0] === 'none' ? [] : values.plugin;

	const hasTailwindFiles =
		values['tailwind-input'] !== undefined ||
		values['tailwind-output'] !== undefined;

	let tailwind = hasTailwindFiles
		? {
				input: values['tailwind-input'],
				output: values['tailwind-output']
			}
		: undefined;

	const useTailwind =
		values.tailwind ?? (hasTailwindFiles ? true : undefined);

	if (useTailwind === false && hasTailwindFiles) {
		console.warn(
			'Warning: Tailwind CSS input/output files are specified but Tailwind is disabled.'
		);
		tailwind = undefined;
	}

	const argumentConfiguration: ArgumentConfiguration = {
		assetsDirectory: values.assets,
		authProvider,
		buildDirectory: values.build,
		codeQualityTool,
		databaseDirectory,
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
		tailwind,
		useTailwind
	};

	return {
		argumentConfiguration,
		debug: values.debug,
		help: values.help,
		latest: values.lts
	};
};
