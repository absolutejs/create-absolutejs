import { mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spinner } from '@clack/prompts';
import { availablePlugins } from './data';
import { installDependencies } from './executors/installDependencies';
import { addConfigurationFiles } from './generators/addConfigurationFiles';
import { createFrontends } from './generators/createFrontends';
import { createPackageJson } from './generators/createPackageJson';
import { createServerFile } from './generators/createServer';
import { initalizeRoot } from './generators/initializeRoot';
import type { PackageManager, PromptResponse } from './types';

export const scaffold = (
	{
		projectName,
		language,
		codeQualityTool,
		initializeGitNow,
		orm,
		plugins,
		authProvider,
		buildDir,
		assetsDir,
		tailwind,
		installDependenciesNow,
		frontendConfigurations
	}: PromptResponse,
	packageManager: PackageManager
) => {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const templatesDir = join(__dirname, '/templates');
	const s = spinner();

	const { frontendDir, backendDir } = initalizeRoot(projectName);

	copyFileSync(
		join(templatesDir, 'README.md'),
		join(projectName, 'README.md')
	);

	addConfigurationFiles({
		codeQualityTool,
		initializeGitNow,
		language,
		projectName,
		tailwind,
		templatesDir
	});

	createPackageJson({ authProvider, plugins, projectName, spin: s });

	const serverFilePath = join(backendDir, 'server.ts');
	createServerFile({
		assetsDir,
		authProvider,
		availablePlugins,
		buildDir,
		frontendConfigurations,
		plugins,
		serverFilePath,
		tailwind
	});

	if (orm === 'drizzle') {
		mkdirSync(join(projectName, 'db'), { recursive: true });
	}

	createFrontends(frontendDir, templatesDir, frontendConfigurations);

	if (installDependenciesNow) {
		installDependencies(projectName, packageManager, s);
	}
};
