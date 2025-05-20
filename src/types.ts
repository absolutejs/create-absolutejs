export type FrontendFramework = {
	name: string;
	label: string;
};

export type FrontendConfiguration = {
	name: string;
	directory: string;
};

export type ImportEntry = {
	packageName: string;
	isPlugin: boolean;
	config?: Record<string, unknown> | null;
};

export type AvailableDependency = {
	value: string;
	label?: string;
	imports: ImportEntry[];
	latestVersion: string;
};

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type AuthProvier = 'absoluteAuth' | undefined;
export type DatabaseEngine =
	| 'postgresql'
	| 'mysql'
	| 'sqlite'
	| 'mongodb'
	| 'redis'
	| 'singlestore'
	| 'cockroachdb'
	| 'mssql'
	| undefined;
export type DatabaseHost =
	| 'neon'
	| 'planetscale'
	| 'supabase'
	| 'turso'
	| 'vercel'
	| 'upstash'
	| 'atlas'
	| undefined;

export type HTMLScriptOption = 'ts' | 'js' | 'ts+ssr' | 'js+ssr' | undefined;
export type ConfigType = 'default' | 'custom';
export type ORM = 'drizzle' | 'prisma' | undefined;
export type CodeQualityTool = 'eslint+prettier' | 'biome';
export type Language = 'ts' | 'js';
export type TailwindConfig =
	| {
			input: string;
			output: string;
	  }
	| undefined;

export type PromptResponse = {
	assetsDirectory: string;
	authProvider: AuthProvier;
	buildDirectory: string;
	configType: ConfigType;
	databaseEngine: DatabaseEngine;
	frontendConfigurations: FrontendConfiguration[];
	frontends: string[];
	htmlScriptOption: HTMLScriptOption;
	initializeGitNow: boolean;
	installDependenciesNow: boolean;
	language: Language;
	codeQualityTool: CodeQualityTool;
	orm: ORM;
	plugins: string[];
	projectName: string;
	tailwind: TailwindConfig;
	useTailwind: boolean;
	databaseDirectory: string | undefined;
	databaseHost: DatabaseHost;
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
