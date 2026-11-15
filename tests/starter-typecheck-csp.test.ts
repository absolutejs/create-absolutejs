import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, test } from 'bun:test';
import { createPackageJson } from '../src/generators/configurations/generatePackageJson';
import { generateHTMLPage } from '../src/generators/html/generateHTMLPage';
import { generateHTMXPage } from '../src/generators/htmx/generateHTMXPage';
import { generateBuildBlock } from '../src/generators/project/generateBuildBlock';
import { generateErrorPage } from '../src/generators/project/generateErrorPage';
import { renderReadme } from '../src/generators/project/generateReadme';
import { generateRoutesBlock } from '../src/generators/project/generateRoutesBlock';
import { generateReactExamplePage } from '../src/generators/react/generateReactComponents';
import { generateSveltePage } from '../src/generators/svelte/generateSveltePage';
import type { Frontend, PackageJson } from '../src/types';

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
	test('build and start run the AbsoluteJS CLI', async () => {
		const { scripts } = await generate({ html: 'html' });
		expect(scripts?.build).toBe('absolute build');
		expect(scripts?.start).toBe('absolute start');
	});

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

/* absolute.config.ts for a project with these frontends. */
const generateConfig = (frontendDirectories: Record<string, string>) => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-config-'));
	try {
		const backendDirectory = join(project, 'src', 'backend');
		mkdirSync(backendDirectory, { recursive: true });
		generateBuildBlock({
			assetsDirectory: 'src/backend/assets',
			backendDirectory,
			buildDirectory: 'build',
			frontendDirectories,
			publicDirectory: 'public',
			tailwind: undefined
		});

		return readFileSync(join(project, 'absolute.config.ts'), 'utf8');
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
};

describe('the starter font (Poppins) is self-hosted', () => {
	test('React and Svelte projects configure it; others do not', () => {
		for (const frontend of ['react', 'svelte']) {
			const config = generateConfig({ [frontend]: frontend });
			expect(config).toContain(
				"families: [{ family: 'Poppins', weights: [400, 500, 600, 700] }]"
			);
			expect(config).toContain('injectHtml: false');
		}
		for (const frontend of ['vue', 'angular', 'html', 'htmx'])
			expect(generateConfig({ [frontend]: frontend })).not.toContain(
				'fonts:'
			);
	});

	test('no starter page links Google Fonts', () => {
		const pages = [
			generateReactExamplePage('none', true, 'react'),
			generateReactExamplePage('abs', true, 'react'),
			generateReactExamplePage('none', false, 'react'),
			generateSveltePage(['svelte'], 'src', true),
			generateSveltePage(['svelte'], 'src', false),
			readFileSync(
				join(
					import.meta.dir,
					'../src/templates/react/components/Head.tsx'
				),
				'utf8'
			)
		];
		for (const page of pages) expect(page).not.toContain('googleapis');
	});

	test('the React and Svelte pages receive and link fontAssets(manifest)', () => {
		const routes = generateRoutesBlock({
			authOption: 'none',
			databaseEngine: 'none',
			frontendDirectories: { react: 'react', svelte: 'svelte' }
		});
		const pageRoutes = ['/', '/react', '/svelte'];
		expect(routes.match(/fonts: fontAssets\(manifest\)/g)).toHaveLength(
			pageRoutes.length
		);
		for (const examples of [true, false]) {
			expect(
				generateReactExamplePage('none', examples, 'react')
			).toContain('<Head cssPath={cssPath} fonts={fonts} />');
			expect(generateSveltePage(['svelte'], 'src', examples)).toContain(
				'{#each fonts.stylesheets as href (href)}'
			);
		}
	});
});

const FRONTENDS = [
	'angular',
	'html',
	'htmx',
	'react',
	'svelte',
	'vue'
] as const satisfies readonly Frontend[];

describe('the README', () => {
	const template = readFileSync(
		join(import.meta.dir, '../src/templates/README.md'),
		'utf8'
	);

	test('mentions vue-tsc only for Vue projects', () => {
		expect(renderReadme(template, ['vue'])).toContain('vue-tsc');
		for (const frontends of [
			['react', 'svelte', 'html', 'htmx'],
			['angular']
		] as const)
			expect(renderReadme(template, [...frontends])).not.toContain(
				'vue-tsc'
			);
	});

	test('mentions vue-tsc for each single framework only when it is Vue', () => {
		for (const frontend of FRONTENDS)
			expect(renderReadme(template, [frontend]).includes('vue-tsc')).toBe(
				frontend === 'vue'
			);
	});

	test('every `bun run <script>` it shows exists in package.json', async () => {
		const projects = [
			...FRONTENDS.map((frontend) => [frontend]),
			[...FRONTENDS]
		];
		const checks = projects.map(async (frontends) => {
			const readme = renderReadme(template, frontends);
			const { scripts } = await generate(
				Object.fromEntries(frontends.map((name) => [name, name]))
			);
			const commands = [...readme.matchAll(/bun run ([\w:-]+)/g)].map(
				(match) => match[1]
			);
			expect(commands.length).toBeGreaterThan(0);
			for (const command of commands)
				expect(Object.keys(scripts ?? {})).toContain(command ?? '');
		});
		await Promise.all(checks);
	});

	test('leaves no section markers', () => {
		for (const frontends of [['vue'], ['react']] as const)
			expect(renderReadme(template, [...frontends])).not.toContain(
				'<!--'
			);
	});
});
