#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import {
	cancel,
	isCancel,
	multiselect,
	outro,
	select,
	text
} from '@clack/prompts';
import colors from 'picocolors';

const { blueBright, yellow, cyan, green, magenta, red, reset, white } = colors;

const frameworkNames: Record<string, string> = {
	angular: 'Angular',
	html: 'HTML',
	htmx: 'HTMX',
	react: 'React',
	solid: 'Solid',
	svelte: 'Svelte',
	vue: 'Vue'
};

/* eslint-disable */
function abort(): never {
	cancel('Operation cancelled');
	exit(0);
}
/* eslint-enable */

const DEFAULT_ARG_LENGTH = 2;
const { values } = parseArgs({
	args: argv.slice(DEFAULT_ARG_LENGTH),
	options: {
		help: { default: false, short: 'h', type: 'boolean' }
	},
	strict: false
});

if (values.help) {
	// prettier-ignore
	console.log(`
		Usage: create-absolute [OPTION]...

		Options:
		-h, --help    Show this help message and exit
	`);
	exit(0);
}

// 1. Project name
const projectName = await text({
	message: 'Project name:',
	placeholder: 'absolutejs-project'
});
if (isCancel(projectName)) abort();

// 2. Language
const language = await select({
	message: 'Language:',
	options: [
		{ label: blueBright('TypeScript'), value: 'ts' },
		{ label: yellow('JavaScript'), value: 'js' }
	]
});
if (isCancel(language)) abort();

// 3. Tailwind support?
const useTailwind = await select({
	message: 'Add Tailwind support?',
	options: [
		{ label: green('Yes'), value: true },
		{ label: red('No'), value: false }
	]
});
if (isCancel(useTailwind)) abort();

let tailwind: { input: string; output: string } | undefined;
if (useTailwind) {
	const input = await text({
		message: 'Tailwind input CSS file:',
		placeholder: './example/styles/tailwind.css'
	});
	if (isCancel(input)) abort();
	const output = await text({
		message: 'Tailwind output CSS file:',
		placeholder: '/assets/css/tailwind.generated.css'
	});
	if (isCancel(output)) abort();
	tailwind = { input, output };
}

// 4. Framework(s)
const frameworks = await multiselect({
	message: 'Framework(s) (space to select, enter to finish):',
	options: [
		{ label: cyan('React'), value: 'react' },
		{ label: green('Vue'), value: 'vue' },
		{ label: magenta('Svelte'), value: 'svelte' },
		{ label: red('Angular'), value: 'angular' },
		{ label: blueBright('Solid'), value: 'solid' },
		{ label: white('HTML'), value: 'html' },
		{ label: white('HTMX'), value: 'htmx' }
	]
});
if (isCancel(frameworks)) abort();

// 5. Build directory
const buildDir = await text({
	message: 'Build directory:',
	placeholder: 'build'
});
if (isCancel(buildDir)) abort();

// 6. Assets directory
const assetsDir = await text({
	message: 'Assets directory:',
	placeholder: 'src/backend/assets'
});
if (isCancel(assetsDir)) abort();

// 7. Framework-specific directories
type Config = { framework: string; pages: string; index: string };

const single = frameworks.length === 1;

const configs = await frameworks.reduce<Promise<Config[]>>(
	async (previousConfigsPromise, framework) => {
		const previousConfigs = await previousConfigsPromise;

		const prettyName = frameworkNames[framework] ?? framework;
		const baseDirectory = single
			? 'src/frontend'
			: `src/frontend/${framework}`;

		const defaultPagesDirectory = `${baseDirectory}/pages`;
		const defaultIndexDirectory = `${baseDirectory}/indexes`;

		const pagesDirectory = await text({
			message: `${prettyName} pages directory:`,
			placeholder: defaultPagesDirectory
		});
		if (isCancel(pagesDirectory)) abort();

		const indexDirectory = await text({
			message: `${prettyName} index directory:`,
			placeholder: defaultIndexDirectory
		});
		if (isCancel(indexDirectory)) abort();

		return [
			...previousConfigs,
			{ framework, index: indexDirectory, pages: pagesDirectory }
		];
	},
	Promise.resolve([])
);

// 8. Database provider
const dbProvider = await select({
	message: 'Database provider:',
	options: [
		{ label: cyan('PostgreSQL'), value: 'postgres' },
		{ label: green('MySQL'), value: 'mysql' },
		{ label: reset('None'), value: 'none' }
	]
});
if (isCancel(dbProvider)) abort();

// 9. ORM choice (optional)
let orm: 'drizzle' | 'prisma' | undefined;
if (dbProvider !== 'none') {
	const ormChoice = await select({
		message: 'Choose an ORM (optional):',
		options: [
			{ label: cyan('Drizzle'), value: 'drizzle' },
			{ label: magenta('Prisma'), value: 'prisma' },
			{ label: reset('None'), value: 'none' }
		]
	});
	if (isCancel(ormChoice)) abort();
	orm = ormChoice === 'none' ? undefined : ormChoice;
}

// 10. Auth provider
const authProvider = await select({
	message: 'Auth provider:',
	options: [
		{ label: cyan('Absolute Auth'), value: 'absoluteAuth' },
		{ label: yellow('JWT'), value: 'jwt' },
		{ label: reset('None'), value: 'none' }
	]
});
if (isCancel(authProvider)) abort();

// 11. Additional plugins (optional)
const plugins = await multiselect({
	message:
		'Select additional Elysia plugins (space to select, enter to submit):',
	options: [
		{ label: cyan('⚙️ @elysia/cors'), value: 'cors' },
		{ label: cyan('📦 @elysia/static'), value: 'static' },
		{ label: green('🛠️ elysia-rate-limit'), value: 'rateLimit' },
		{ label: green('📑 elysia-swagger'), value: 'swagger' }
	],
	required: false
});
if (isCancel(plugins)) abort();

// Summary
outro(`
  Project Name:     ${projectName}
  Language:         ${language === 'ts' ? 'TypeScript' : 'JavaScript'}
  Tailwind:         ${tailwind ? `input: ${tailwind.input}, output: ${tailwind.output}` : 'None'}
  Framework(s):     ${frameworks.join(', ')}
  Build Directory:  ${buildDir}
  Assets Directory: ${assetsDir}
  Database:         ${dbProvider === 'none' ? 'None' : dbProvider}
  ORM:              ${orm ?? 'None'}
  Auth:             ${authProvider === 'none' ? 'None' : authProvider}
  Plugins:          ${plugins.length ? plugins.join(', ') : 'None'}

  Framework Config:
    ${configs
		.map(
			({ framework, pages, index }) =>
				`${frameworkNames[framework] ?? framework} ⇒ pages: ${pages}, index: ${index}`
		)
		.join('\n    ')}
`);
