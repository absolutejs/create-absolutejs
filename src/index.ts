#!/usr/bin/env node
import { outro } from '@clack/prompts';
import colors from 'picocolors';
import { prompt } from './prompt';
import type { FrontendFramework } from './types';

const { blueBright, cyan, green, magenta, red } = colors;

// eslint-disable-next-line absolute/sort-keys-fixable
const availableFrontends: Record<string, FrontendFramework> = {
	react: { label: cyan('React'), name: 'React' },
	html: { label: 'HTML', name: 'HTML' },
	svelte: { label: magenta('Svelte'), name: 'Svelte' },
	angular: { label: red('Angular'), name: 'Angular' },
	solid: { label: blueBright('Solid'), name: 'Solid' },
	vue: { label: green('Vue'), name: 'Vue' },
	htmx: { label: 'HTMX', name: 'HTMX' }
};

const {
	pkgManager,
	projectName,
	language,
	lintTool,
	tailwind,
	frameworks,
	buildDir,
	assetsDir,
	frameworkConfigurations,
	dbProvider,
	orm,
	authProvider,
	plugins,
	initGit,
	installDeps
} = await prompt(availableFrontends);

// Summary
outro(`
  Project Name:     ${projectName}
  Package Manager:  ${pkgManager}
  Language:         ${language === 'ts' ? 'TypeScript' : 'JavaScript'}
  Linting:          ${lintTool === 'eslint' ? 'ESLint + Prettier' : 'Biome'}
  Tailwind:         ${tailwind ? `input: ${tailwind.input}, output: ${tailwind.output}` : 'None'}
  Framework(s):     ${frameworks.join(', ')}
  Build Directory:  ${buildDir}
  Assets Directory: ${assetsDir}
  Database:         ${dbProvider === 'none' ? 'None' : dbProvider}
  ORM:              ${orm ?? 'None'}
  Auth:             ${authProvider === 'none' ? 'None' : authProvider}
  Plugins:          ${plugins.length ? plugins.join(', ') : 'None'}
  Git Repository:   ${initGit ? 'Initialized' : 'None'}
  Install Deps:     ${installDeps ? 'Yes' : 'No'}

  Framework Config:
    ${frameworkConfigurations
		.map(
			({ framework, pages, index }) =>
				`${availableFrontends[framework] ?? framework} ⇒ pages: ${pages}, index: ${index}`
		)
		.join('\n    ')}
`);
