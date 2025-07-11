import { writeFileSync } from 'fs';
import { UNFOUND_INDEX } from '../../constants';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins
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

	const requiresHtml = htmlDirectory !== undefined;
	const requiresReact = reactDirectory !== undefined;
	const requiresSvelte = svelteDirectory !== undefined;

	const htmlOnly = requiresHtml && !requiresReact && !requiresSvelte;

	const selectedCustomPlugins = availablePlugins.filter(
		({ value }) => plugins.indexOf(value) !== UNFOUND_INDEX
	);
	const authenticationPlugins =
		authProvider === 'absoluteAuth' ? [absoluteAuthPlugin] : [];

	const allDependencies = [
		...defaultDependencies,
		...defaultPlugins,
		...selectedCustomPlugins,
		...authenticationPlugins
	];

	const uniqueDependencies = Array.from(
		new Map(
			allDependencies.map((dependency) => [dependency.value, dependency])
		).values()
	).sort((a, b) => a.value.localeCompare(b.value));

	const importLines = uniqueDependencies.flatMap(({ value, imports }) => {
		const filteredImports =
			htmlOnly && imports
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
				'handleSveltePageRequest'
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

	const manifestDeclaration = `${htmlOnly ? '' : 'const manifest = '}await build({
  ${manifestOptions.join(',\n  ')}
});`;

	const routes = Object.entries(frontendDirectories)
		.reduce<string[]>(
			(routesAccumulator, [frameworkName, directory], index) => {
				let handler = '';

				switch (frameworkName) {
					case 'html':
						handler = `handleHTMLPageRequest(\`${buildDirectory}${directory ? `/${directory}` : ''}/pages/HTMLExample.html\`)`;
						break;

					case 'react':
						handler = `handleReactPageRequest(ReactExample, asset(manifest, 'ReactExampleIndex'), {
				initialCount: 0,
				cssPath: asset(manifest, 'ReactExampleCSS')
			})`;
						break;

					case 'svelte':
						handler = `handleSveltePageRequest(SvelteExample, asset(manifest, 'SvelteExample'), asset(manifest, 'SvelteExampleIndex'), {
						initialCount: 0,
						cssPath: asset(manifest, 'SvelteExampleCSS')
					})`;
						break;

					default:
						return routesAccumulator;
				}

				if (index === 0) {
					routesAccumulator.push(`.get('/', () => ${handler})`);
				}

				routesAccumulator.push(
					`.get('${frameworkName}', () => ${handler})`
				);

				return routesAccumulator;
			},
			[]
		)
		.join('\n  ');

	const serverFileContent = `${importLines.join('\n')}

${manifestDeclaration}

new Elysia()${routes}
${useStatements.map((s) => `  ${s}`).join('\n')}
  .on('error', (err) => {
    const { request } = err;
    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`);
  });
`;

	writeFileSync(serverFilePath, serverFileContent);
};
