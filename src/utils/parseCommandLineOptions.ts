import { argv, exit } from 'process';
import { parseArgs } from 'util';
import {
	ProviderOption,
	isValidProviderOption,
	providers
} from '@absolutejs/auth';
import { DEFAULT_ARG_LENGTH } from '../constants';
import {
	availableAuthProviders,
	availableDatabaseEngines,
	availableDatabaseHosts,
	availableDirectoryConfigurations,
	availableDrizzleDialects,
	availableORMs,
	availablePrismaDialects
} from '../data';
import {
	isValidAuthOption,
	isDatabaseEngine,
	isDatabaseHost,
	isDirectoryConfig,
	isDrizzleDialect,
	isORM,
	isPrismaDialect
} from '../typeGuards';
import type {
	ArgumentConfiguration,
	AuthOption,
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
			'abs-provider': { multiple: true, type: 'string' },
			angular: { type: 'boolean' },
			'angular-dir': { type: 'string' },
			assets: { type: 'string' },
			auth: { type: 'string' },
			biome: { type: 'boolean' },
			build: { type: 'string' },
			db: { type: 'string' },
			'db-dir': { type: 'string' },
			'db-host': { type: 'string' },
			debug: { default: false, short: 'd', type: 'boolean' },
			directory: { type: 'string' },
			env: { multiple: true, type: 'string' },
			'eslint+prettier': { type: 'boolean' },
			git: { type: 'boolean' },
			help: { default: false, short: 'h', type: 'boolean' },
			html: { type: 'boolean' },
			'html-dir': { type: 'string' },
			'html-scripts': { type: 'boolean' },
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
		positionals[0] ?? (values.skip ? 'absolutejs-project' : undefined);

	let authOption: AuthOption;
	if (values.auth !== undefined && !isValidAuthOption(values.auth)) {
		errors.push(
			`Invalid auth provider: "${values.auth}". Expected: [ ${availableAuthProviders.join(', ')} ]`
		);
	} else if (values.auth !== undefined) {
		authOption = values.auth;
	} else if (values.skip) {
		authOption = 'none';
	}

	const absProviders: ProviderOption[] = [];
	if (
		values['abs-provider'] !== undefined &&
		(authOption === undefined || authOption === 'none')
	) {
		authOption = 'abs';
	} else if (values['abs-provider'] !== undefined && authOption !== 'abs') {
		errors.push(
			`Invalid auth configuration: "--abs-provider" specified but auth provider is set to "${authOption}". "--abs-provider" can only be used with "abs" auth provider.`
		);
	}
	const rawProviders = values['abs-provider'] ?? [];
	const validProviders = rawProviders.filter(isValidProviderOption);
	const invalidProviders = rawProviders.filter(
		(provider) => !isValidProviderOption(provider)
	);
	for (const provider of invalidProviders) {
		errors.push(
			`Invalid Absolute-Auth provider: "${provider}". Expected: ${Object.keys(providers).join(', ')}`
		);
	}
	absProviders.push(...validProviders);

	let databaseEngine: DatabaseEngine;
	if (values.db !== undefined && !isDatabaseEngine(values.db)) {
		errors.push(
			`Invalid database engine: "${values.db}". Expected: [ ${availableDatabaseEngines.join(', ')} ]`
		);
	} else if (values.db !== undefined) {
		databaseEngine = values.db;
	} else if (values.skip) {
		databaseEngine = 'none';
	}

	let databaseHost: DatabaseHost;
	if (values['db-host'] !== undefined && !isDatabaseHost(values['db-host'])) {
		errors.push(
			`Invalid database host: "${values['db-host']}". Expected: [ ${availableDatabaseHosts.join(', ')} ]`
		);
	} else if (values['db-host'] !== undefined) {
		databaseHost = values['db-host'];
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

	if (
		values.orm === 'drizzle' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		!isDrizzleDialect(databaseEngine)
	) {
		errors.push(
			`Invalid database engine for Drizzle ORM: "${databaseEngine}". Expected: [ ${availableDrizzleDialects.join(', ')} ]`
		);
	}

	if (
		values.orm === 'prisma' &&
		databaseEngine !== undefined &&
		databaseEngine !== 'none' &&
		!isPrismaDialect(databaseEngine)
	) {
		errors.push(
			`Invalid database engine for Prisma ORM: "${databaseEngine}". Expected: [ ${availablePrismaDialects.join(', ')} ]`
		);
	}

	if (
		values['db-host'] === 'turso' &&
		(databaseEngine === undefined || databaseEngine === 'none')
	) {
		databaseEngine = 'sqlite';
	} else if (values['db-host'] === 'turso' && databaseEngine !== 'sqlite') {
		errors.push(
			`Invalid database engine for Turso: "${databaseEngine}". Expected: "sqlite".`
		);
	}

	if (values['db-host'] === 'neon' && databaseEngine !== 'postgresql') {
		errors.push(
			`Invalid database engine for Neon: "${databaseEngine}". Expected: "postgresql".`
		);
	}

	if (
		values['db-host'] === 'planetscale' &&
		databaseEngine !== 'postgresql' &&
		databaseEngine !== 'mysql'
	) {
		errors.push(
			`Invalid database engine for PlanetScale: "${databaseEngine}". Expected: "postgresql" or "mysql".`
		);
	}

	if (errors.length > 0) {
		console.error(errors.join('\n'));
		exit(1);
	}

	if (databaseEngine === 'none' && databaseHost !== 'none') {
		console.warn(
			'Warning: Setting the database host without setting a database engine has no effect.'
		);
		databaseHost = 'none';
	}

	if (databaseEngine === 'none' && orm !== 'none') {
		console.warn(
			'Warning: Setting an ORM without a database engine has no effect.'
		);
		orm = 'none';
	}

	let databaseDirectory = values['db-dir'];
	if (databaseEngine === 'none' && databaseDirectory !== undefined) {
		console.warn(
			'Warning: Setting a database directory without a database engine has no effect.'
		);
		databaseDirectory = undefined;
	}

	if (values['eslint+prettier'] && values.biome) {
		console.warn(
			'Warning: Both ESLint+Prettier and Biome are set to enabled. Only ESLint+Prettier will be used.'
		);
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

	const rawEnv = values.env ?? [];
	const validEnv: string[] = [];

	for (const entry of rawEnv) {
		const idx = entry.indexOf('=');
		const key = idx > 0 ? entry.slice(0, idx) : '';
		const badFormat = idx <= 0;
		const badKey = !badFormat && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key);

		const errorMsg =
			(badFormat &&
				`Invalid --env entry: "${entry}". Expected KEY=VALUE`) ||
			(badKey && `Invalid env var name: "${key}"`) ||
			undefined;

		void (errorMsg && console.error(errorMsg));
		if (errorMsg) continue;

		validEnv.push(entry);
	}

	values.env = validEnv.length ? validEnv : undefined;

	const argumentConfiguration: ArgumentConfiguration = {
		absProviders: absProviders.length ? absProviders : undefined,
		assetsDirectory: values.assets,
		authOption,
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
		useHTMLScripts: values['html-scripts'],
		useTailwind
	};

	return {
		argumentConfiguration,
		debug: values.debug,
		envVariables: values.env,
		help: values.help,
		latest: values.lts
	};
};
