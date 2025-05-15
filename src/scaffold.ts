import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PromptResponse } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const scaffold = ({
	projectName,
	language,
	codeQualityTool,
	buildDir
}: PromptResponse) => {
	const root = projectName;
	mkdirSync(root, { recursive: true });

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
	const templatesDir = join(__dirname, '/templates');
	copyFileSync(join(templatesDir, 'README.md'), join(root, 'README.md'));

	// tsconfig.json (if TS)
	if (language === 'ts') {
		writeFileSync(
			join(root, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					module: 'ESNext',
					moduleResolution: 'node',
					outDir: buildDir,
					strict: true,
					target: 'ESNext'
				},
				include: ['src']
			})
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
