import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, test } from 'bun:test';
import { createPackageJson } from '../src/generators/configurations/generatePackageJson';
import { generateHTMLPage } from '../src/generators/html/generateHTMLPage';
import { generateHTMXPage } from '../src/generators/htmx/generateHTMXPage';
import { generateErrorPage } from '../src/generators/project/generateErrorPage';
import type { PackageJson } from '../src/types';

const generate = async (frontendDirectories: Record<string, string>) => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-package-'));
	try {
		await createPackageJson({
			agentic: false,
			authOption: 'none',
			codeQualityTool: 'eslint+prettier',
			databaseEngine: 'none',
			databaseHost: 'none',
			frontendDirectories,
			latest: false,
			orm: 'none',
			plugins: [],
			projectName: project,
			repositoryUrl: undefined,
			useTailwind: false
		});

		const packageJson: PackageJson = JSON.parse(
			readFileSync(join(project, 'package.json'), 'utf8')
		);

		return packageJson;
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
};

describe('generated package.json', () => {
	test('typecheck runs absolute typecheck', async () => {
		const { scripts } = await generate({ react: 'react' });
		expect(scripts?.typecheck).toBe('absolute typecheck');
	});

	test('Svelte gets svelte-check and svelte2tsx for absolute typecheck', async () => {
		const { devDependencies } = await generate({ svelte: 'svelte' });
		expect(devDependencies?.['svelte-check']).toBeDefined();
		expect(devDependencies?.['svelte2tsx']).toBeDefined();
	});

	test('Vue gets vue-tsc, and vue-router for the auto router', async () => {
		const { dependencies, devDependencies } = await generate({
			vue: 'vue'
		});
		expect(devDependencies?.['vue-tsc']).toBeDefined();
		expect(dependencies?.['vue-router']).toMatch(/^4\./);
	});

	test('Angular gets @angular/router at the same version as @angular/core', async () => {
		const { dependencies } = await generate({ angular: 'angular' });
		expect(dependencies?.['@angular/router']).toBe(
			dependencies?.['@angular/core']
		);
	});

	test('React-only projects get none of the other frameworks’ checkers', async () => {
		const { dependencies, devDependencies } = await generate({
			react: 'react'
		});
		const all: Record<string, string> = {
			...dependencies,
			...devDependencies
		};
		for (const name of [
			'svelte-check',
			'vue-tsc',
			'vue-router',
			'@angular/router'
		])
			expect(all[name]).toBeUndefined();
	});
});

describe('starter pages work under secureHeaders()’ CSP', () => {
	const inlineHandler = /\son[a-z]+\s*=/i;

	test('the HTML page has no inline event handlers', () => {
		for (const useScripts of [true, false])
			expect(
				generateHTMLPage(['html'], useScripts, 'src', true, true)
			).not.toMatch(inlineHandler);
	});

	test('the HTMX page has no inline event handlers and loads its script', () => {
		const page = generateHTMXPage(true, ['htmx'], 'src', true);
		expect(page).not.toMatch(inlineHandler);
		expect(page).toContain(
			'<script src="../scripts/htmx-example.ts"></script>'
		);
	});
});

describe('the error.html convention page', () => {
	test('shows the error placeholders and works under secureHeaders()', () => {
		const page = generateErrorPage(
			'AbsoluteJS + HTML',
			'../../styles/indexes/html-example.css'
		);
		expect(page).toContain('{{ message }}');
		expect(page).toContain('{{ stack }}');
		expect(page).not.toMatch(/\son[a-z]+\s*=/i);
		expect(page).not.toContain('<script');
		expect(page).not.toContain('<style');
	});
});
