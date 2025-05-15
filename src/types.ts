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
	installDeps: boolean;
	language: 'ts' | 'js';
	codeQualityTool: 'eslint+prettier' | 'biome';
	orm: 'drizzle' | 'prisma' | undefined;
	plugins: string[];
	projectName: string;
	tailwind: { input: string; output: string } | undefined;
	useTailwind: boolean;
};
