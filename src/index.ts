#!/usr/bin/env node
import {
	outro,

} from '@clack/prompts';
import { prompt } from './prompt';

const availableFrontends: Record<string, string> = {
	angular: 'Angular',
	html: 'HTML',
	htmx: 'HTMX',
	react: 'React',
	solid: 'Solid',
	svelte: 'Svelte',
	vue: 'Vue'
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
	configs,
	dbProvider,
	orm,
	authProvider,
	plugins,
	initGit,
	installDeps
} = await prompt(availableFrontends)

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
    ${configs
		.map(
			({ framework, pages, index }) =>
				`${availableFrontends[framework] ?? framework} ⇒ pages: ${pages}, index: ${index}`
		)
		.join('\n    ')}
`);
