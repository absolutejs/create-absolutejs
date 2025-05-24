import { writeFileSync } from 'fs';
import { UNFOUND_INDEX } from '../../constants';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins
} from '../../data';
import type { AvailableDependency, PromptResponse } from '../../types';

type CreateServerFileProps = Pick<
	PromptResponse,
	| 'tailwind'
	| 'authProvider'
	| 'plugins'
	| 'buildDirectory'
	| 'assetsDirectory'
	| 'frontendConfigurations'
> & {
	availablePlugins: AvailableDependency[];
	serverFilePath: string;
};

export const createServerFile = ({
	tailwind,
	frontendConfigurations,
	serverFilePath,
	authProvider,
	availablePlugins,
	buildDirectory,
	assetsDirectory,
	plugins
}: CreateServerFileProps) => {
	const requiresHtml = frontendConfigurations.some(
		(configuration) => configuration.name === 'html'
	);
	const requiresReact = frontendConfigurations.some(
		(configuration) => configuration.name === 'react'
	);
	const isSingleFrontend = frontendConfigurations.length === 1;

	const selectedCustomPlugins = availablePlugins.filter(
		(plugin) => plugins.indexOf(plugin.value) !== UNFOUND_INDEX
	);

	const authenticationPlugins: AvailableDependency[] = [];
	if (authProvider === 'absoluteAuth') {
		authenticationPlugins.push(absoluteAuthPlugin);
	}

	const combinedDependencies = [
		...defaultDependencies,
		...defaultPlugins,
		...selectedCustomPlugins,
		...authenticationPlugins
	];

	const uniqueDependencies: AvailableDependency[] = [];
	combinedDependencies.forEach((dependency) => {
		if (
			!uniqueDependencies.some(
				(existingDependency) =>
					existingDependency.value === dependency.value
			)
		) {
			uniqueDependencies.push(dependency);
		}
	});
	uniqueDependencies.sort((firstDependency, secondDependency) =>
		firstDependency.value.localeCompare(secondDependency.value)
	);

	const importLines = uniqueDependencies.flatMap((dependency) => {
		const importsArray = dependency.imports ?? [];

		return importsArray.length > 0
			? [
					`import { ${importsArray
						.map((importEntry) => importEntry.packageName)
						.join(', ')} } from '${dependency.value}';`
				]
			: [];
	});

	const absoluteImportLineIndex = importLines.findIndex((importLine) =>
		importLine.includes("from '@absolutejs/absolute'")
	);
	if (absoluteImportLineIndex >= 0) {
		const originalImportLine = importLines[absoluteImportLineIndex]!;
		importLines[absoluteImportLineIndex] = originalImportLine.replace(
			/import\s*\{([\s\S]*?)\}\s*from '@absolutejs\/absolute';/,
			(_fullMatch, importList) => {
				const importedItems = importList
					.split(',')
					.map((item: string) => item.trim())
					.filter(Boolean);

				if (
					requiresHtml &&
					!importedItems.includes('handleHTMLPageRequest')
				) {
					importedItems.push('handleHTMLPageRequest');
				}
				if (
					requiresReact &&
					!importedItems.includes('handleReactPageRequest')
				) {
					importedItems.push('handleReactPageRequest');
				}

				return `import { ${importedItems.join(', ')} } from '@absolutejs/absolute';`;
			}
		);
	}

	if (requiresReact) {
		const reactImportSource = isSingleFrontend
			? '../frontend/pages/ReactExample'
			: '../frontend/react/pages/ReactExample';
		importLines.push(
			`import { ReactExample } from '${reactImportSource}';`
		);
	}

	const useStatements = uniqueDependencies
		.flatMap((dependency) => dependency.imports)
		.filter((importEntry) => importEntry?.isPlugin)
		.map((importEntry) => {
			if (importEntry?.config === undefined) {
				return `.use(${importEntry?.packageName})`;
			}
			if (importEntry.config === null) {
				return `.use(${importEntry.packageName}())`;
			}

			return `.use(${importEntry.packageName}(${JSON.stringify(importEntry.config)}))`;
		});

	const manifestOptions = [
		`buildDirectory: '${buildDirectory}'`,
		`assetsDirectory: '${assetsDirectory}'`,
		...frontendConfigurations
			.map((configuration) =>
				configuration.directory
					? `${configuration.name}Directory: './src/frontend/${configuration.directory}'`
					: `${configuration.name}Directory: './src/frontend/'`
			)
			.filter((option) => option !== ''),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	];

	const buildStatement = `const manifest = await build({\n  ${manifestOptions.join(
		',\n  '
	)}\n});`;

	let guardStatements = `if (manifest === null) throw new Error('Manifest was not generated');`;
	if (requiresReact) {
		guardStatements += `
const { ReactExampleIndex } = manifest;
if (ReactExampleIndex === undefined) throw new Error('ReactExampleIndex was not generated');`;
	}

	let routeDefinitions = '';
	frontendConfigurations.forEach((configuration, index) => {
		const routePath = index === 0 ? '/' : `/${configuration.name}`;
		if (configuration.name === 'html') {
			routeDefinitions += `
  .get('${routePath}', () =>
    handleHTMLPageRequest(\`${buildDirectory}/html/pages/HtmlExample.html\`)
  )`;
		} else if (configuration.name === 'react') {
			routeDefinitions += `
  .get('${routePath}', () =>
    handleReactPageRequest(ReactExample, ReactExampleIndex)
  )`;
		}
	});

	let serverFileContent = `${importLines.join('\n')}

${buildStatement}

${guardStatements}

new Elysia()${routeDefinitions}`;
	useStatements.forEach((statement) => {
		serverFileContent += `\n  ${statement}`;
	});
	serverFileContent += `
  .on('error', (error) => {
    const { request } = error;
    console.error(\`Server error on \${request.method} \${request.url}: \${error.message}\`);
  });
`;

	writeFileSync(serverFilePath, serverFileContent);
};
