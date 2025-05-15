import { exit } from 'node:process';
import {
	cancel,
	isCancel,
	multiselect,
	select,
	text,
	confirm
} from '@clack/prompts';
import colors from 'picocolors';
import type {
	FrontendConfiguration,
	FrontendFramework,
	PromptResponse
} from './types';

const { blueBright, yellow, cyan, green, magenta, reset } = colors;

/* eslint-disable */
function abort(): never {
	cancel('Operation cancelled');
	exit(0);
}
/* eslint-enable */

export const prompt = async (
	availableFrontends: Record<string, FrontendFramework>
) => {
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
	const codeQualityTool = await select({
		message: 'Choose linting and formatting tool:',
		options: [
			{
				label: blueBright('ESLint + Prettier'),
				value: 'eslint+prettier'
			},
			{ label: yellow('Biome'), value: 'biome' }
		]
	});
	if (isCancel(codeQualityTool)) abort();

	// 4. Tailwind support?
	const useTailwind = await confirm({ message: 'Add Tailwind support?' });
	if (isCancel(useTailwind)) abort();

	// 5. Framework(s)
	const frontends = await multiselect({
		message: 'Framework(s) (space to select, enter to finish):',
		options: Object.entries(availableFrontends).map(
			([value, { label }]) => ({ label, value })
		)
	});
	if (isCancel(frontends)) abort();

	// 6. HTML scripting option (if HTML was selected)
	let htmlScriptOption;
	if (frontends.includes('html')) {
		const langLabel =
			language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript');
		htmlScriptOption = await select({
			message: `Add HTML scripting option (${langLabel}):`,
			options: [
				{ label: `${langLabel} + SSR`, value: 'ssr' },
				{ label: langLabel, value: 'script' },
				{ label: 'None', value: 'none' }
			]
		});
		if (isCancel(htmlScriptOption)) abort();
	}

	// 7. Configuration type
	const configType = await select({
		message: 'Select configuration:',
		options: [
			{ label: blueBright('Default'), value: 'default' },
			{ label: yellow('Custom'), value: 'custom' }
		]
	});
	if (isCancel(configType)) abort();

	// 8. Build / Tailwind / Assets (custom vs default)
	let tailwind: { input: string; output: string } | undefined;
	let buildDir: string;
	let assetsDir: string;

	// Build directory
	if (configType === 'custom') {
		const _buildDir = await text({
			message: 'Build directory:',
			placeholder: 'build'
		});
		if (isCancel(_buildDir)) abort();
		buildDir = _buildDir;
	} else {
		buildDir = 'build';
	}

	// Assets directory
	if (configType === 'custom') {
		const _assetsDir = await text({
			message: 'Assets directory:',
			placeholder: 'src/backend/assets'
		});
		if (isCancel(_assetsDir)) abort();
		assetsDir = _assetsDir;
	} else {
		assetsDir = 'src/backend/assets';
	}

	// Tailwind
	if (useTailwind) {
		const input =
			configType === 'custom'
				? await text({
						message: 'Tailwind input CSS file:',
						placeholder: './example/styles/tailwind.css'
					})
				: './example/styles/tailwind.css';
		if (isCancel(input)) abort();

		const output =
			configType === 'custom'
				? await text({
						message: 'Tailwind output CSS file:',
						placeholder: '/assets/css/tailwind.generated.css'
					})
				: '/assets/css/tailwind.generated.css';
		if (isCancel(output)) abort();

		tailwind = { input, output };
	}

	// 9. Framework-specific directories
	let frontendConfigurations: FrontendConfiguration[];
	const single = frontends.length === 1;

	if (configType === 'custom') {
		frontendConfigurations = await frontends.reduce<
			Promise<FrontendConfiguration[]>
		>(async (prevP, frontend) => {
			const prev = await prevP;
			const pretty = availableFrontends[frontend]?.name ?? frontend;
			const base = single ? '' : `${frontend}`;
			const defDir = base;

			const frontendDirectory = await text({
				message: `${pretty} directory:`,
				placeholder: defDir
			});
			if (isCancel(frontendDirectory)) abort();

			return [
				...prev,
				{ directory: frontendDirectory, frontend, name: frontend }
			];
		}, Promise.resolve([]));
	} else {
		frontendConfigurations = frontends.map((frontend) => ({
			directory: single ? '' : frontend,
			frontend,
			name: frontend
		}));
	}

	// 10. Database provider
	const dbProvider = await select({
		message: 'Database provider:',
		options: [
			{ label: reset('None'), value: 'none' },
			{ label: cyan('PostgreSQL'), value: 'postgres' },
			{ label: green('MySQL'), value: 'mysql' }
		]
	});
	if (isCancel(dbProvider)) abort();

	// 11. ORM choice (optional)
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

	// 12. Auth provider
	const authProvider = await select({
		message: 'Auth provider:',
		options: [
			{ label: reset('None'), value: 'none' },
			{ label: cyan('Absolute Auth'), value: 'absoluteAuth' },
			{ label: yellow('JWT'), value: 'jwt' }
		]
	});
	if (isCancel(authProvider)) abort();

	// 13. Additional plugins (optional)
	const plugins = await multiselect({
		message:
			'Select additional Elysia plugins (space to select, enter to submit):',
		options: [
			{ label: cyan('📦 @elysia-static'), value: 'static' },
			{ label: cyan('⚙️ @elysia-cors'), value: 'cors' },
			{ label: cyan('📑 @elysiajs/swagger'), value: 'swagger' },
			{ label: green('🛠️ elysia-rate-limit'), value: 'rateLimit' }
		],
		required: false
	});
	if (isCancel(plugins)) abort();

	// 14. Initialize Git repository
	const initializeGit = await confirm({
		message: 'Initialize a git repository?'
	});
	if (isCancel(initializeGit)) abort();

	// 15. Install dependencies
	const installDeps = await confirm({ message: 'Install dependencies now?' });
	if (isCancel(installDeps)) abort();

	const values: PromptResponse = {
		assetsDir,
		authProvider,
		buildDir,
		codeQualityTool,
		configType,
		dbProvider,
		frontendConfigurations,
		frontends,
		htmlScriptOption,
		initializeGit,
		installDeps,
		language,
		orm,
		plugins,
		projectName,
		tailwind,
		useTailwind
	};

	return values;
};
