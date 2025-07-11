import { writeFileSync } from 'fs';
import { UNFOUND_INDEX } from '../../constants';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins,
	scopedStatePlugin
} from '../../data';
import type { AvailableDependency, CreateConfiguration } from '../../types';

type CreateServerFileProps = Pick<
	CreateConfiguration,
	| 'tailwind'
	| 'authProvider'
	| 'plugins'
	| 'buildDirectory'
	| 'assetsDirectory'
	| 'frontendDirectories'
> & {
	availablePlugins: AvailableDependency[];
	serverFilePath: string;
};

export const createServerFile = ({
	tailwind,
	frontendDirectories,
	serverFilePath,
	authProvider,
	availablePlugins,
	buildDirectory,
	assetsDirectory,
	plugins
}: CreateServerFileProps) => {
	const htmlDirectory = frontendDirectories['html'];
	const reactDirectory = frontendDirectories['react'];
	const svelteDirectory = frontendDirectories['svelte'];
	const vueDirectory = frontendDirectories['vue'];
	const htmxDirectory = frontendDirectories['htmx'];

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

	const selectedCustomPlugins = availablePlugins.filter(
		({ value }) => plugins.indexOf(value) !== UNFOUND_INDEX
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
		new Map(
			allDependencies.map((dependency) => [dependency.value, dependency])
		).values()
	).sort((a, b) => a.value.localeCompare(b.value));

	const importLines = uniqueDependencies.flatMap(({ value, imports }) => {
		const filteredImports =
			nonFrameworkOnly && imports
				? imports.filter(({ packageName }) => packageName !== 'asset')
				: imports;

		return filteredImports && filteredImports.length > 0
			? [
					`import { ${filteredImports
						.map(({ packageName }) => packageName)
						.join(', ')} } from '${value}';`
				]
			: [];
	});

	const absoluteImportIdx = importLines.findIndex((line) =>
		line.includes("from '@absolutejs/absolute'")
	);
	if (absoluteImportIdx !== UNFOUND_INDEX && importLines[absoluteImportIdx]) {
		const existingItems = importLines[absoluteImportIdx]
			.replace(/import\s*\{\s*|\}\s*from.*$/g, '')
			.split(',')
			.map((item) => item.trim())
			.filter((value): value is string => value.length > 0);

		const additionalItems = [
			requiresHtml &&
				!existingItems.includes('handleHTMLPageRequest') &&
				'handleHTMLPageRequest',
			requiresReact &&
				!existingItems.includes('handleReactPageRequest') &&
				'handleReactPageRequest',
			requiresSvelte &&
				!existingItems.includes('handleSveltePageRequest') &&
				'handleSveltePageRequest',
			requiresVue &&
				!existingItems.includes('handleVuePageRequest') &&
				'handleVuePageRequest',
			requiresVue &&
				!existingItems.includes('generateHeadElement') &&
				'generateHeadElement',
			requiresHtmx &&
				!existingItems.includes('handleHTMXPageRequest') &&
				'handleHTMXPageRequest'
		].filter((value): value is string => typeof value === 'string');

		importLines[absoluteImportIdx] = `import { ${[
			...existingItems,
			...additionalItems
		].join(', ')} } from '@absolutejs/absolute';`;
	}

	if (reactDirectory !== undefined) {
		const reactImportSource =
			reactDirectory === ''
				? '../frontend/pages/ReactExample'
				: `../frontend/${reactDirectory}/pages/ReactExample`;
		importLines.push(
			`import { ReactExample } from '${reactImportSource}';`
		);
	}

	if (requiresSvelte) {
		const svelteImportSource =
			svelteDirectory === ''
				? '../frontend/pages/SvelteExample'
				: `../frontend/${svelteDirectory}/pages/SvelteExample`;
		importLines.push(
			`import SvelteExample from '${svelteImportSource}.svelte';`
		);
	}

	if (requiresVue) {
		const vueImportSource =
			vueDirectory === ''
				? '../frontend/pages/VueExample'
				: `../frontend/${vueDirectory}/pages/VueExample`;
		importLines.push(`import VueExample from '${vueImportSource}.vue';`);
	}

	const useStatements = uniqueDependencies
		.flatMap(({ imports }) => imports ?? [])
		.filter((entry) => entry.isPlugin)
		.map((entry) => {
			if (entry.config === undefined) return `.use(${entry.packageName})`;
			if (entry.config === null) return `.use(${entry.packageName}())`;

			return `.use(${entry.packageName}(${JSON.stringify(entry.config)}))`;
		});

	const manifestOptions = [
		`assetsDirectory: '${assetsDirectory}'`,
		`buildDirectory: '${buildDirectory}'`,
		...Object.entries(frontendDirectories).map(
			([frameworkName, directory]) =>
				`${frameworkName}Directory: './src/frontend/${directory}'`
		),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	].filter(Boolean);

	const manifestDeclaration = `${
		nonFrameworkOnly ? '' : 'const manifest = '
	}await build({
  ${manifestOptions.join(',\n  ')}
});`;

	const routesData = Object.entries(frontendDirectories).reduce<{
		indexRoute: string | null;
		otherRoutes: string[];
	}>(
		(acc, [frameworkName, directory], index) => {
			let handler;

			switch (frameworkName) {
				case 'html':
					handler = `handleHTMLPageRequest(\`${buildDirectory}${directory ? `/${directory}` : ''}/pages/HTMLExample.html\`)`;
					break;
				case 'react':
					handler = `handleReactPageRequest(ReactExample, asset(manifest, 'ReactExampleIndex'), { initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') })`;
					break;
				case 'svelte':
					handler = `handleSveltePageRequest(SvelteExample, asset(manifest, 'SvelteExample'), asset(manifest, 'SvelteExampleIndex'), { initialCount: 0, cssPath: asset(manifest, 'SvelteExampleCSS') })`;
					break;
				case 'vue':
					handler = `handleVuePageRequest(VueExample, asset(manifest, 'VueExample'), asset(manifest, 'VueExampleIndex'), generateHeadElement({ cssPath: asset(manifest, 'VueExampleCSS'), title: 'AbsoluteJS + Vue' }), { initialCount: 0 })`;
					break;
				case 'htmx':
					handler = `handleHTMXPageRequest(\`${buildDirectory}${directory ? `/${directory}` : ''}/pages/HTMXExample.html\`)`;
					if (index === 0) {
						acc.indexRoute = `.get('/', () => ${handler})`;
					}
					acc.otherRoutes.push(
						`.post('/htmx/reset', ({ resetScopedStore }) => resetScopedStore())`,
						`.get('/htmx/count', ({ scopedStore }) => scopedStore.count)`,
						`.post('/htmx/increment', ({ scopedStore }) => ++scopedStore.count)`,
						`.get('htmx', () => ${handler})`
					);

					return acc;
				default:
					return acc;
			}

			if (index === 0) {
				acc.indexRoute = `.get('/', () => ${handler})`;
			}
			acc.otherRoutes.push(`.get('${frameworkName}', () => ${handler})`);

			return acc;
		},
		{ indexRoute: null, otherRoutes: [] }
	);

	const routes = [routesData.indexRoute ?? '', ...routesData.otherRoutes]
		.filter(Boolean)
		.join('\n  ');

	const useLines = useStatements.map((s) => `  ${s}`).join('\n');

	const serverFileContent = `${importLines.join('\n')}

${manifestDeclaration}

new Elysia()
${useLines}
  ${routes}
  .on('error', (err) => {
    const { request } = err;
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`);
  });
`;

	writeFileSync(serverFilePath, serverFileContent);
};
