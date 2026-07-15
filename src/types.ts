import { ProviderOption } from '@absolutejs/auth';
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
	absProviders: ProviderOption[] | undefined;
	assetsDirectory: string;
	authOption: AuthOption;
	editBasePath: string;
	includeExamples: boolean;
	targetDirectory: string;
	templatesDirectory: string;
	projectAssetsDirectory: string;
	stylesDirectory: string;
	stylesIndexesDirectory: string;
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

export type AuthOption = (typeof availableAuthProviders)[number] | undefined;

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

export type GithubLinkOption = 'existing' | 'create' | 'skip';

export type CreateConfiguration = {
	agentic: boolean;
	absProviders: ProviderOption[] | undefined;
	assetsDirectory: string;
	authOption: AuthOption;
	buildDirectory: string;
	directoryConfig: DirectoryConfiguration;
	databaseEngine: DatabaseEngine;
	frontendDirectories: FrontendDirectories;
	frontends: Frontend[];
	includeExamples: boolean;
	useHTMLScripts: boolean;
	initializeGitNow: boolean;
	githubLink: GithubLinkOption;
	githubRepoUrl: string | undefined;
	githubVisibility: 'public' | 'private' | undefined;
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

// The canonical PackageJson shape lives in the framework; re-export it so this
// package keeps a single source of truth (no drift).
export type { PackageJson } from '@absolutejs/absolute';
