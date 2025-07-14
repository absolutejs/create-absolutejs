import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UNFOUND_INDEX } from '../../constants';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins,
	scopedStatePlugin
} from '../../data';
import type {
	AvailableDependency,
	CreateConfiguration,
	Frontend
} from '../../types';

type CreateServerFileProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'authProvider'
	| 'plugins'
	| 'buildDirectory'
	| 'databaseHost'
	| 'orm'
	| 'assetsDirectory'
	| 'frontendDirectories'
> & {
	availablePlugins: AvailableDependency[];
	backendDirectory: string;
};

export const generateServerFile = ({
	tailwind,
	frontendDirectories,
	backendDirectory,
	authProvider,
	availablePlugins,
	buildDirectory,
	assetsDirectory,
	plugins
}: CreateServerFileProps) => {
	const serverFilePath = join(backendDirectory, 'server.ts');

	const {
		html: htmlDirectory,
		react: reactDirectory,
		svelte: svelteDirectory,
		vue: vueDirectory,
		htmx: htmxDirectory
	} = frontendDirectories;

	const requiresHtml = htmlDirectory !== undefined;
	const requiresReact = reactDirectory !== undefined;
	const requiresSvelte = svelteDirectory !== undefined;
	const requiresVue = vueDirectory !== undefined;
	const requiresHtmx = htmxDirectory !== undefined;

	const nonFrameworkOnly =
		(requiresHtml || requiresHtmx) &&
		!requiresReact &&
		!requiresSvelte &&
		!requiresVue;

	const selectedCustomPlugins = availablePlugins.filter((plugin) =>
		plugins.includes(plugin.value)
	);
	const authenticationPlugins =
		authProvider === 'absoluteAuth' ? [absoluteAuthPlugin] : [];
	const htmxPlugins = requiresHtmx ? [scopedStatePlugin] : [];

	const allDependencies = [
		...defaultDependencies,
		...defaultPlugins,
		...selectedCustomPlugins,
		...authenticationPlugins,
		...htmxPlugins
	];

	const uniqueDependencies = Array.from(
		new Map(allDependencies.map((dep) => [dep.value, dep])).values()
	).sort((a, b) => a.value.localeCompare(b.value));

	const importStatements: string[] = [];

	for (const dependency of uniqueDependencies) {
		const items = dependency.imports ?? [];
		const filteredItems = nonFrameworkOnly
			? items.filter((item) => item.packageName !== 'asset')
			: items;

		if (!filteredItems.length) continue;

		importStatements.push(
			`import { ${filteredItems.map((i) => i.packageName).join(', ')} } from '${dependency.value}';`
		);
	}

	const absoluteImportIndex = importStatements.findIndex((line) =>
		line.includes("from '@absolutejs/absolute'")
	);
	const importStatementIndex = absoluteImportIndex;
	const importLine = importStatements[importStatementIndex];

	if (importStatementIndex !== UNFOUND_INDEX && importLine) {
		const existingImports = importLine
			.replace(/import\s*\{\s*|\}\s*from.*$/g, '')
			.split(',')
			.map((name) => name.trim())
			.filter((name): name is string => Boolean(name));

		const requiredImports = [
			requiresHtml && 'handleHTMLPageRequest',
			requiresReact && 'handleReactPageRequest',
			requiresSvelte && 'handleSveltePageRequest',
			requiresVue && 'handleVuePageRequest',
			requiresVue && 'generateHeadElement',
			requiresHtmx && 'handleHTMXPageRequest'
		].filter((imp): imp is string => Boolean(imp));

		const mergedImports = Array.from(
			new Set([...existingImports, ...requiredImports])
		);

		importStatements[importStatementIndex] =
			`import { ${mergedImports.join(', ')} } from '@absolutejs/absolute';`;
	}

	if (requiresReact) {
		const path = reactDirectory
			? `../frontend/${reactDirectory}/pages/ReactExample`
			: '../frontend/pages/ReactExample';
		importStatements.push(`import { ReactExample } from '${path}';`);
	}

	if (requiresSvelte) {
		const path = svelteDirectory
			? `../frontend/${svelteDirectory}/pages/SvelteExample.svelte`
			: '../frontend/pages/SvelteExample.svelte';
		importStatements.push(`import SvelteExample from '${path}';`);
	}

	if (requiresVue) {
		const path = vueDirectory
			? `../frontend/${vueDirectory}/pages/VueExample.vue`
			: '../frontend/pages/VueExample.vue';
		const vueStatement = requiresSvelte
			? `import { vueImports } from './utils/vueImporter';\n\nconst { VueExample } = vueImports;`
			: `import VueExample from '${path}';`;
		importStatements.push(vueStatement);
	}

	if (requiresVue && requiresSvelte) {
		const utilsDir = join(backendDirectory, 'utils');
		mkdirSync(utilsDir, { recursive: true });
		writeFileSync(
			join(utilsDir, 'vueImporter.ts'),
			`import VueExample from "../../frontend/vue/pages/VueExample.vue";

export const vueImports = { VueExample } as const;
`
		);
	}

	const useStatements = uniqueDependencies
		.flatMap((dep) => dep.imports ?? [])
		.filter((i) => i.isPlugin)
		.map((i) => {
			if (i.config === undefined) return `  .use(${i.packageName})`;
			if (i.config === null) return `  .use(${i.packageName}())`;

			return `  .use(${i.packageName}(${JSON.stringify(i.config)}))`;
		})
		.join('\n');

	const frontendEntries = Object.entries(frontendDirectories) as [
		Frontend,
		string
	][];
	const manifestOptions = [
		`assetsDirectory: '${assetsDirectory}'`,
		`buildDirectory: '${buildDirectory}'`,
		...frontendEntries.map(
			([framework, dir]) => `${framework}Directory: 'src/frontend/${dir}'`
		),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	].filter(Boolean);

	const manifestDeclaration = `${nonFrameworkOnly ? '' : 'const manifest = '}await build({
  ${manifestOptions.join(',\n  ')}
});`;

	const getHandler = (framework: Frontend, directory: string) => {
		switch (framework) {
			case 'html':
				return `handleHTMLPageRequest(\`${buildDirectory}${directory ? `/${directory}` : ''}/pages/HTMLExample.html\`)`;
			case 'react':
				return `handleReactPageRequest(ReactExample, asset(manifest, 'ReactExampleIndex'), { initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') })`;
			case 'svelte':
				return `handleSveltePageRequest(SvelteExample, asset(manifest, 'SvelteExample'), asset(manifest, 'SvelteExampleIndex'), { initialCount: 0, cssPath: asset(manifest, 'SvelteExampleCSS') })`;
			case 'vue':
				return `handleVuePageRequest(VueExample, asset(manifest, 'VueExample'), asset(manifest, 'VueExampleIndex'), generateHeadElement({ cssPath: asset(manifest, 'VueExampleCSS'), title: 'AbsoluteJS + Vue' }), { initialCount: 0 })`;
			case 'htmx':
				return `handleHTMXPageRequest(\`${buildDirectory}${directory ? `/${directory}` : ''}/pages/HTMXExample.html\`)`;
			default:
				return '';
		}
	};

	let indexRoute = '';
	const otherRoutes: string[] = [];

	frontendEntries.forEach(([framework, dir], idx) => {
		const handlerCall = getHandler(framework, dir);
		if (idx === 0) {
			indexRoute = `.get('/', () => ${handlerCall})`;
		}
		if (framework === 'htmx') {
			otherRoutes.push(
				`.get('/htmx', () => ${handlerCall})`,
				`.post('/htmx/reset', ({ resetScopedStore }) => resetScopedStore())`,
				`.get('/htmx/count', ({ scopedStore }) => scopedStore.count)`,
				`.post('/htmx/increment', ({ scopedStore }) => ++scopedStore.count)`
			);
		} else {
			otherRoutes.push(`.get('/${framework}', () => ${handlerCall})`);
		}
	});

	const routes = [indexRoute, ...otherRoutes].filter(Boolean).join('\n  ');

	const content = `${importStatements.join('\n')}

${manifestDeclaration}

new Elysia()
${useStatements}
  ${routes}
  .on('error', (err) => {
    const { request } = err;
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`);
  });
`;

	writeFileSync(serverFilePath, content);
};
