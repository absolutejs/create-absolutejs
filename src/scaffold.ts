import {
	existsSync,
	mkdirSync,
	writeFileSync,
	copyFileSync,
	cpSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PackageJson, PromptResponse } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const scaffold = ({
	projectName,
	language,
	codeQualityTool,
	initializeGit,
	orm,
	tailwind,
	installDependencies,
	frontendConfigurations
}: PromptResponse) => {
	const root = projectName;
	if (existsSync(root)) {
		throw new Error(
			`Cannot create project "${projectName}": directory already exists.`
		);
	}

	// create base directories
	mkdirSync(root, { recursive: true });
	const srcDir = join(root, 'src');
	mkdirSync(srcDir, { recursive: true });
	const frontendDir = join(srcDir, 'frontend');
	mkdirSync(frontendDir, { recursive: true });
	mkdirSync(join(srcDir, 'backend'), { recursive: true });
	mkdirSync(join(srcDir, 'types'), { recursive: true });

	// create db folder at project root if using Drizzle
	if (orm === 'drizzle') {
		mkdirSync(join(root, 'db'), { recursive: true });
	}

	const templatesDir = join(__dirname, 'templates');

	// scaffold each frontend
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

	// copy React styles
	const hasReact = frontendConfigurations.some((f) => f.name === 'react');
	if (hasReact) {
		const reactStylesSrc = join(templatesDir, 'react', 'styles');
		const stylesDir = join(frontendDir, 'styles');

		if (frontendConfigurations.length === 1) {
			cpSync(reactStylesSrc, stylesDir, { recursive: true });
		} else {
			const dest = join(stylesDir, 'react', 'defaults');
			mkdirSync(dest, { recursive: true });
			cpSync(join(reactStylesSrc, 'default'), dest, { recursive: true });
		}
	}

	// copy Tailwind configs if requested
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

	// Create the package.json file
	const dependencies: PackageJson['dependencies'] = {};

	const devDependencies: PackageJson['devDependencies'] = {};

	const scripts: PackageJson['scripts'] = {
		test: 'echo "Error: no test specified" && exit 1',
		format: 'prettier --write "./**/*.{js,jsx,ts,tsx,css,json}"',
		dev: 'bun run src/index.ts',
		lint: 'eslint ./src',
		typecheck: 'bun run tsc --noEmit'
	};

	const packageJson: PackageJson = {
		name: projectName,
		type: 'module',
		version: '0.1.0',
		dependencies,
		devDependencies,
		scripts
	};

	writeFileSync(join(root, 'package.json'), JSON.stringify(packageJson));

	// copy other files
	copyFileSync(join(templatesDir, 'README.md'), join(root, 'README.md'));

	if (initializeGit) {
		copyFileSync(
			join(templatesDir, '.gitignore'),
			join(root, '.gitignore')
		);
	}

	if (language === 'ts') {
		copyFileSync(
			join(templatesDir, 'tsconfig.example.json'),
			join(root, 'tsconfig.json')
		);
	}

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
	} else {
		console.warn('⚠️  Biome support not implemented yet');
	}
};
