export type FrontendFramework = {
	name: string;
	label: string;
};

export type FrontendConfiguration = {
	name: string;
	directory: string;
};

export type PromptResponse = {
	assetsDir: string;
	authProvider: 'none' | 'absoluteAuth' | 'jwt';
	buildDir: string;
	configType: 'default' | 'custom';
	dbProvider: 'none' | 'postgres' | 'mysql';
	frontendConfigurations: FrontendConfiguration[];
	frontends: string[];
	htmlScriptOption: 'none' | 'script' | 'ssr' | undefined;
	initializeGit: boolean;
	installDependencies: boolean;
	language: 'ts' | 'js';
	codeQualityTool: 'eslint+prettier' | 'biome';
	orm: 'drizzle' | 'prisma' | undefined;
	plugins: string[];
	projectName: string;
	tailwind: { input: string; output: string } | undefined;
	useTailwind: boolean;
};

export interface PackageJson {
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
		[key: string]: any;
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
	config?: Record<string, any>;
	resolution?: Record<string, string>;
	resolutions?: Record<string, string>;
	[customField: string]: any;
}
