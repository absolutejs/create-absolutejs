import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PromptResponse, FrontendConfiguration } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const scaffold = ({
	projectName,
	language,
	codeQualityTool,
	initializeGit,
	frontendConfigurations
}: PromptResponse) => {
	const root = projectName;
	mkdirSync(root, { recursive: true });

	// create src folders: frontend, backend, types
	const srcDir = join(root, 'src');
	mkdirSync(srcDir, { recursive: true });
	const frontendDir = join(srcDir, 'frontend');
	mkdirSync(frontendDir, { recursive: true });
	mkdirSync(join(srcDir, 'backend'), { recursive: true });
	mkdirSync(join(srcDir, 'types'), { recursive: true });

	// create any additional frontend subdirectories
	frontendConfigurations.forEach(({ directory }: FrontendConfiguration) => {
		mkdirSync(join(frontendDir, directory), { recursive: true });
	});

	// package.json
	writeFileSync(
		join(root, 'package.json'),
		JSON.stringify({
			name: projectName,
			type: 'module',
			version: '0.1.0'
		})
	);

	// README.md (from templates)
	const templatesDir = join(__dirname, 'templates');
	copyFileSync(join(templatesDir, 'README.md'), join(root, 'README.md'));

	// optionally add .gitignore
	if (initializeGit) {
		copyFileSync(
			join(templatesDir, '.gitignore'),
			join(root, '.gitignore')
		);
	}

	// tsconfig.json (if TS) — copy example template
	if (language === 'ts') {
		copyFileSync(
			join(templatesDir, 'tsconfig.example.json'),
			join(root, 'tsconfig.json')
		);
	}

	// ESLint + Prettier (from templates) or warn for Biome
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
