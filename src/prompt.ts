import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import {
	cancel,
	isCancel,
	multiselect,
	select,
	text,
	confirm
} from '@clack/prompts';
import colors from 'picocolors';
import { getUserPkgManager, type PackageManager } from './utils';

const { blueBright, yellow, cyan, green, magenta, red, reset, white } = colors;

function abort(): never {
	cancel('Operation cancelled');
	exit(0);
}

type Config = { framework: string; pages: string; index: string };

export async function prompt(availableFrontends: Record<string, string>) {
	const DEFAULT_ARG_LENGTH = 2;
	const { values } = parseArgs({
		args: argv.slice(DEFAULT_ARG_LENGTH),
		options: { help: { default: false, short: 'h', type: 'boolean' } },
		strict: false
	});

	const pkgManager = getUserPkgManager();

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

	// 3. Linting/formatting tool
	const lintTool = await select({
		message: 'Choose linting and formatting tool:',
		options: [
			{ label: blueBright('ESLint + Prettier'), value: 'eslint' },
			{ label: yellow('Biome'), value: 'biome' }
		]
	});
	if (isCancel(lintTool)) abort();

	// 4. Tailwind support?
	const useTailwind = await confirm({ message: 'Add Tailwind support?' });
	if (isCancel(useTailwind)) abort();

	// 5. Framework(s)
	const frameworks = await multiselect({
		message: 'Framework(s) (space to select, enter to finish):',
		options: [
			{ label: cyan('React'), value: 'react' },
			{ label: green('Vue'), value: 'vue' },
			{ label: magenta('Svelte'), value: 'svelte' },
			{ label: red('Angular'), value: 'angular' },
			{ label: blueBright('Solid'), value: 'solid' },
			{ label: 'HTML', value: 'html' },
			{ label: 'HTMX', value: 'htmx' }
		]
	});
	if (isCancel(frameworks)) abort();

	// 6. Configuration type
	const configType = await select({
		message: 'Select configuration:',
		options: [
			{ label: blueBright('Default'), value: 'default' },
			{ label: yellow('Custom'), value: 'custom' }
		]
	});
	if (isCancel(configType)) abort();

	// 7. Build / Tailwind / Assets (custom vs default)
	let tailwind: { input: string; output: string } | undefined;
	let buildDir: string;
	let assetsDir: string;

	if (configType === 'custom') {
		const _buildDir = await text({
			message: 'Build directory:',
			placeholder: 'build'
		});
		if (isCancel(_buildDir)) abort();
		buildDir = _buildDir;

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

		const _assetsDir = await text({
			message: 'Assets directory:',
			placeholder: 'src/backend/assets'
		});
		if (isCancel(_assetsDir)) abort();
		assetsDir = _assetsDir;
	} else {
		if (useTailwind) {
			tailwind = {
				input: './example/styles/tailwind.css',
				output: '/assets/css/tailwind.generated.css'
			};
		}
		buildDir = 'build';
		assetsDir = 'src/backend/assets';
	}

	// 8. Framework-specific directories
	let configs: Config[];
	const single = frameworks.length === 1;

	if (configType === 'custom') {
		configs = await frameworks.reduce<Promise<Config[]>>(
			async (prevP, framework) => {
				const prev = await prevP;
				const pretty = availableFrontends[framework] ?? framework;
				const base = single
					? 'src/frontend'
					: `src/frontend/${framework}`;
				const defPages = `${base}/pages`;
				const defIndex = `${base}/indexes`;

				const pages = await text({
					message: `${pretty} pages directory:`,
					placeholder: defPages
				});
				if (isCancel(pages)) abort();
				const index = await text({
					message: `${pretty} index directory:`,
					placeholder: defIndex
				});
				if (isCancel(index)) abort();
				return [...prev, { framework, pages, index }];
			},
			Promise.resolve([])
		);
	} else {
		configs = frameworks.map((framework) => ({
			framework,
			pages: `${single ? 'src/frontend' : `src/frontend/${framework}`}/pages`,
			index: `${single ? 'src/frontend' : `src/frontend/${framework}`}/indexes`
		}));
	}

	// 9. Database provider
	const dbProvider = await select({
		message: 'Database provider:',
		options: [
			{ label: reset('None'), value: 'none' },
			{ label: cyan('PostgreSQL'), value: 'postgres' },
			{ label: green('MySQL'), value: 'mysql' }
		]
	});
	if (isCancel(dbProvider)) abort();

	// 10. ORM choice (optional)
	let orm: 'drizzle' | 'prisma' | undefined;
	if (dbProvider !== 'none') {
		const ormChoice = await select({
			message: 'Choose an ORM (optional):',
			options: [
				{ label: reset('None'), value: 'none' },
				{ label: cyan('Drizzle'), value: 'drizzle' },
				{ label: magenta('Prisma'), value: 'prisma' }
			]
		});
		if (isCancel(ormChoice)) abort();
		orm = ormChoice === 'none' ? undefined : ormChoice;
	}

	// 11. Auth provider
	const authProvider = await select({
		message: 'Auth provider:',
		options: [
			{ label: reset('None'), value: 'none' },
			{ label: cyan('Absolute Auth'), value: 'absoluteAuth' },
			{ label: yellow('JWT'), value: 'jwt' }
		]
	});
	if (isCancel(authProvider)) abort();

	// 12. Additional plugins (optional)
	const plugins = await multiselect({
		message:
			'Select additional Elysia plugins (space to select, enter to submit):',
		options: [
			{ label: cyan('📦 @elysia/static'), value: 'static' },
			{ label: cyan('⚙️ @elysia/cors'), value: 'cors' },
			{ label: cyan('📑 @elysiajs/swagger'), value: 'swagger' },
			{ label: green('🛠️ elysia-rate-limit'), value: 'rateLimit' }
		],
		required: false
	});
	if (isCancel(plugins)) abort();

	// 13. Initialize Git repository
	const initGit = await confirm({ message: 'Initialize a git repository?' });
	if (isCancel(initGit)) abort();

	// 14. Install dependencies
	const installDeps = await confirm({ message: 'Install dependencies now?' });
	if (isCancel(installDeps)) abort();

	return {
		pkgManager,
		projectName,
		language,
		lintTool,
		useTailwind,
		frameworks,
		tailwind,
		buildDir,
		assetsDir,
		configs,
		dbProvider,
		orm,
		authProvider,
		plugins,
		initGit,
		installDeps
	};
}
