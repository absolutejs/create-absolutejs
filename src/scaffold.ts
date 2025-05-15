import { execSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	writeFileSync,
	copyFileSync,
	cpSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { spinner } from '@clack/prompts';
import type { PackageJson, PromptResponse } from './types';
import type { PackageManager } from './utils';
import { dim, yellow } from 'picocolors';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const scaffold = (
	{
		projectName,
		language,
		codeQualityTool,
		initializeGit,
		orm,
		tailwind,
		installDependencies,
		frontendConfigurations
	}: PromptResponse,
	packageManager: PackageManager
) => {
	const root = projectName;
	if (existsSync(root))
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);

	mkdirSync(root, { recursive: true });
	const srcDir = join(root, 'src');
	mkdirSync(srcDir, { recursive: true });
	const frontendDir = join(srcDir, 'frontend');
	mkdirSync(frontendDir, { recursive: true });
	mkdirSync(join(srcDir, 'backend'), { recursive: true });
	mkdirSync(join(srcDir, 'types'), { recursive: true });

	if (orm === 'drizzle') mkdirSync(join(root, 'db'), { recursive: true });

	const templatesDir = join(__dirname, 'templates');

	frontendConfigurations.forEach(({ name, directory }) => {
		const targetDir = join(frontendDir, directory);
		mkdirSync(targetDir, { recursive: true });

		if (name === 'react') {
			const reactTemplates = join(templatesDir, 'react');
			cpSync(join(reactTemplates, 'pages'), join(targetDir, 'pages'), {
				recursive: true
			});
			cpSync(
				join(reactTemplates, 'components'),
				join(targetDir, 'components'),
				{ recursive: true }
			);
			cpSync(join(reactTemplates, 'hooks'), join(targetDir, 'hooks'), {
				recursive: true
			});
		}
	});

	const hasReact = frontendConfigurations.some((f) => f.name === 'react');
	const reactStylesSrc = join(templatesDir, 'react', 'styles');
	const stylesDir = join(frontendDir, 'styles');
	const isSingle = hasReact && frontendConfigurations.length === 1;
	const isMulti = hasReact && frontendConfigurations.length > 1;

	if (isSingle) {
		cpSync(reactStylesSrc, stylesDir, { recursive: true });
	}

	if (isMulti) {
		const dest = join(stylesDir, 'react', 'defaults');
		mkdirSync(dest, { recursive: true });
		cpSync(join(reactStylesSrc, 'default'), dest, { recursive: true });
	}

	if (tailwind) {
		copyFileSync(
			join(templatesDir, 'tailwind', 'postcss.config.ts'),
			join(root, 'postcss.config.ts')
		);
		copyFileSync(
			join(templatesDir, 'tailwind', 'tailwind.config.ts'),
			join(root, 'tailwind.config.ts')
		);
	}

	const dependencies: PackageJson['dependencies'] = {
		elysia: '1.2.0'
	};
	const devDependencies: PackageJson['devDependencies'] = {};
	const scripts: PackageJson['scripts'] = {
		dev: 'bun run src/index.ts',
		format: 'prettier --write "./**/*.{js,jsx,ts,tsx,css,json}"',
		lint: 'eslint ./src',
		test: 'echo "Error: no test specified" && exit 1',
		typecheck: 'bun run tsc --noEmit'
	};

	const packageJson: PackageJson = {
		dependencies,
		devDependencies,
		name: projectName,
		scripts,
		type: 'module',
		version: '0.1.0'
	};

	writeFileSync(join(root, 'package.json'), JSON.stringify(packageJson));
	copyFileSync(join(templatesDir, 'README.md'), join(root, 'README.md'));

	if (initializeGit)
		copyFileSync(
			join(templatesDir, '.gitignore'),
			join(root, '.gitignore')
		);
	if (language === 'ts')
		copyFileSync(
			join(templatesDir, 'tsconfig.example.json'),
			join(root, 'tsconfig.json')
		);
	if (codeQualityTool === 'eslint+prettier') {
		copyFileSync(
			join(templatesDir, 'eslint.config.mjs'),
			join(root, 'eslint.config.mjs')
		);
		copyFileSync(
			join(templatesDir, '.prettierignore'),
			join(root, '.prettierignore')
		);
		copyFileSync(
			join(templatesDir, '.prettierrc.json'),
			join(root, '.prettierrc.json')
		);
	} else
		console.warn(
			`${dim('│')}\n${yellow('▲')}  Biome support not implemented yet`
		);

	if (!installDependencies) return;

	const s = spinner();
	s.start('Installing dependencies…');

	const commands: Record<string, string> = {
		bun: 'bun install',
		npm: 'npm install',
		pnpm: 'pnpm install',
		yarn: 'yarn install'
	};

	const cmd = commands[packageManager] ?? 'bun install';

	try {
		execSync(cmd, { cwd: root, stdio: 'pipe' });
		s.stop('Dependencies installed');
	} catch (err) {
		s.stop('Installation failed');
		console.error('Error installing dependencies:', err);
		exit(1);
	}
};
