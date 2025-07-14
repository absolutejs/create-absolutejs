import {
	availableAuthProviders,
	availableCodeQualityTools,
	availableDatabaseEngines,
	availableDatabaseHosts,
	availableDirectoryConfigurations,
	availableDrizzleDialects,
	availableFrontends,
	availableORMs,
	availablePrismaDialects
} from './data';

export type ScaffoldFrontendProps = {
	targetDirectory: string;
	templatesDirectory: string;
	projectAssetsDirectory: string;
	isSingleFrontend: boolean;
	frontends: Frontend[];
};

export type Frontend = (typeof availableFrontends)[number];
export type FrontendLabels = Record<Frontend, string>;
export type FrontendDirectories = Partial<Record<Frontend, string>>;

export type ImportEntry = {
	packageName: string;
	isPlugin: boolean;
	config?: Record<string, unknown> | null;
};

export type AvailableDependency = {
	value: string;
	label?: string;
	imports?: ImportEntry[];
	latestVersion: string;
};

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type AuthProvider = (typeof availableAuthProviders)[number] | undefined;

export type AvailableDrizzleDialect = (typeof availableDrizzleDialects)[number];
export type AvailablePrismaDialect = (typeof availablePrismaDialects)[number];

export type DatabaseEngine =
	| (typeof availableDatabaseEngines)[number]
	| undefined;

export type DatabaseHost = (typeof availableDatabaseHosts)[number] | undefined;
export type DirectoryConfiguration =
	(typeof availableDirectoryConfigurations)[number];
export type ORM = (typeof availableORMs)[number] | undefined;
export type CodeQualityTool = (typeof availableCodeQualityTools)[number];
export type TailwindConfig =
	| {
			input: string;
			output: string;
	  }
	| undefined;

export type CreateConfiguration = {
	assetsDirectory: string;
	authProvider: AuthProvider;
	buildDirectory: string;
	directoryConfig: DirectoryConfiguration;
	databaseEngine: DatabaseEngine;
	frontendDirectories: FrontendDirectories;
	frontends: Frontend[];
	useHTMLScripts: boolean;
	initializeGitNow: boolean;
	installDependenciesNow: boolean;
	codeQualityTool: CodeQualityTool;
	orm: ORM;
	plugins: string[];
	projectName: string;
	tailwind: TailwindConfig;
	useTailwind: boolean;
	databaseDirectory: string | undefined;
	databaseHost: DatabaseHost;
};

type DeepUndefined<T> = T extends object
	? { [P in keyof T]: DeepUndefined<T[P]> | undefined }
	: T | undefined;

export type ArgumentConfiguration = {
	[K in keyof CreateConfiguration]:
		| DeepUndefined<CreateConfiguration[K]>
		| undefined;
};

export type PackageJson = {
	// Basic identity
	name: string;
	version: string;
	description?: string;
	keywords?: string[];

	// Module resolution
	main?: string;
	module?: string;
	browser?: string | Record<string, string>;
	types?: string;
	typings?: string;
	exports?: string | Record<string, string | Record<string, string>>;
	imports?: Record<string, string>;

	// Entry points
	bin?: string | Record<string, string>;
	files?: string[];

	// Scripts
	scripts?: Record<string, string>;

	// Publishing
	private?: boolean;
	publishConfig?: {
		registry?: string;
		[key: string]: unknown;
	};

	// Dependencies
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	bundledDependencies?: string[];
	bundleDependencies?: string[];

	// Configurations
	engines?: {
		node?: string;
		npm?: string;
		[key: string]: string | undefined;
	};
	os?: string[];
	cpu?: string[];
	workspaces?: string[] | { packages: string[]; nohoist?: string[] };

	// Metadata
	repository?:
		| string
		| {
				type?: 'git' | string;
				url: string;
				directory?: string;
		  };
	bugs?: string | { url?: string; email?: string };
	homepage?: string;
	author?: string | { name: string; email?: string; url?: string };
	contributors?: Array<
		string | { name: string; email?: string; url?: string }
	>;
	license?: string;
	funding?: string | Array<{ type?: string; url: string }>;
	preferGlobal?: boolean;
	sideEffects?: boolean | string[];

	// Misc
	config?: Record<string, unknown>;
	resolution?: Record<string, string>;
	resolutions?: Record<string, string>;
	[customField: string]: unknown;
};
