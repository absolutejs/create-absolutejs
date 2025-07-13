import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { DEFAULT_ARG_LENGTH } from '../constants';
import {
	availableAuthProviders,
	availableDatabaseEngines,
	availableDatabaseHosts,
	availableDirectoryConfigurations,
	availableORMs
} from '../data';
import {
	isAuthProvider,
	isDatabaseEngine,
	isDatabaseHost,
	isDirectoryConfig,
	isORM
} from '../typeGuards';
import type {
	ArgumentConfiguration,
	AuthProvider,
	DatabaseEngine,
	DatabaseHost,
	Frontend,
	FrontendDirectories,
	ORM
} from '../types';

export const parseCommandLineOptions = () => {
	const { values, positionals } = parseArgs({
		allowNegative: true,
		allowPositionals: true,
		args: argv.slice(DEFAULT_ARG_LENGTH),
		options: {
			angular: { type: 'boolean' },
			'angular-dir': { type: 'string' },
			assets: { type: 'string' },
			auth: { type: 'string' },
			biome: { type: 'boolean' },
			build: { type: 'string' },
			database: { type: 'string' },
			debug: { default: false, short: 'd', type: 'boolean' },
			directory: { type: 'string' },
			engine: { type: 'string' },
			'eslint+prettier': { type: 'boolean' },
			git: { type: 'boolean' },
			help: { default: false, short: 'h', type: 'boolean' },
			host: { type: 'string' },
			html: { type: 'boolean' },
			'html-dir': { type: 'string' },
			'html-script': { type: 'boolean' },
			htmx: { type: 'boolean' },
			'htmx-dir': { type: 'string' },
			install: { type: 'boolean' },
			lts: { default: false, type: 'boolean' },
			orm: { type: 'string' },
			plugin: { multiple: true, type: 'string' },
			react: { type: 'boolean' },
			'react-dir': { type: 'string' },
			skip: { type: 'boolean' },
			svelte: { type: 'boolean' },
			'svelte-dir': { type: 'string' },
			tailwind: { type: 'boolean' },
			'tailwind-input': { type: 'string' },
			'tailwind-output': { type: 'string' },
			vue: { type: 'boolean' },
			'vue-dir': { type: 'string' }
		}
	});

	const errors: string[] = [];

	const projectName =
		(positionals[0] ?? values.skip) ? 'absolutejs-project' : undefined;

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

	const useESLintPrettier = values['eslint+prettier'];
	const useBiome = values.biome;

	let codeQualityTool: 'eslint+prettier' | 'biome' | undefined;
	if (useESLintPrettier) {
		codeQualityTool = 'eslint+prettier';
	} else if (useBiome) {
		codeQualityTool = 'biome';
	} else {
		codeQualityTool = undefined;
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

	const selectedFrontends: Frontend[] = [];
	// if (values.angular) selectedFrontends.push('angular')
	if (values.html) selectedFrontends.push('html');
	if (values.htmx) selectedFrontends.push('htmx');
	if (values.react) selectedFrontends.push('react');
	if (values.svelte) selectedFrontends.push('svelte');
	if (values.vue) selectedFrontends.push('vue');

	const frontendDirectories: FrontendDirectories = {};
	// if (values['angular-dir'] !== undefined) {
	// 	frontendDirectories.angular = values['angular-dir']
	// }
	if (values['html-dir'] !== undefined) {
		frontendDirectories.html = values['html-dir'];
	}
	if (values['htmx-dir'] !== undefined) {
		frontendDirectories.htmx = values['htmx-dir'];
	}
	if (values['react-dir'] !== undefined) {
		frontendDirectories.react = values['react-dir'];
	}
	if (values['svelte-dir'] !== undefined) {
		frontendDirectories.svelte = values['svelte-dir'];
	}
	if (values['vue-dir'] !== undefined) {
		frontendDirectories.vue = values['vue-dir'];
	}

	if (values.plugin === undefined && values.skip) {
		values.plugin = ['none'];
	}
	const plugins =
		values.plugin && values.plugin[0] === 'none' ? [] : values.plugin;

	const hasTailwindFiles =
		values['tailwind-input'] !== undefined ||
		values['tailwind-output'] !== undefined;

	let tailwind = hasTailwindFiles
		? { input: values['tailwind-input'], output: values['tailwind-output'] }
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
		frontends: selectedFrontends.length ? selectedFrontends : undefined,
		initializeGitNow: values.git,
		installDependenciesNow: values.install,
		orm,
		plugins,
		projectName,
		tailwind,
		useHTMLScripts: values['html-script'],
		useTailwind
	};

	return {
		argumentConfiguration,
		debug: values.debug,
		help: values.help,
		latest: values.lts
	};
};
