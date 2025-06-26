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
	const htmlConfig = frontendConfigurations.find(
		({ name }) => name === 'html'
	);
	const reactConfig = frontendConfigurations.find(
		({ name }) => name === 'react'
	);

	const requiresHtml = htmlConfig !== undefined;
	const requiresReact = reactConfig !== undefined;
	const isSingleFrontend = frontendConfigurations.length === 1;

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

	const importLines = uniqueDependencies.flatMap(({ value, imports }) =>
		imports && imports.length > 0
			? [
					`import { ${imports.map(({ packageName }) => packageName).join(', ')} } from '${value}';`
				]
			: []
	);

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
				'handleReactPageRequest'
		].filter((value): value is string => typeof value === 'string');

		importLines[absoluteImportIdx] =
			`import { ${[...existingItems, ...additionalItems].join(', ')} } from '@absolutejs/absolute';`;
	}

	if (reactConfig) {
		const reactImportSource = isSingleFrontend
			? '../frontend/pages/ReactExample'
			: `../frontend/${reactConfig.directory}/pages/ReactExample`;
		importLines.push(
			`import { ReactExample } from '${reactImportSource}';`
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
		`buildDirectory: '${buildDirectory}'`,
		`assetsDirectory: '${assetsDirectory}'`,
		...frontendConfigurations.map(
			({ name, directory }) =>
				`${name}Directory: './src/frontend/${directory}'`
		),
		tailwind ? `tailwind: ${JSON.stringify(tailwind)}` : ''
	].filter(Boolean);

	const manifestDeclaration = `const manifest = await build({\n  ${manifestOptions.join(',\n  ')}\n});`;

	const guardStatements = [
		`if (manifest === null) throw new Error('Manifest was not generated');`,
		requiresReact
			? `const { ReactExampleIndex } = manifest;\nif (ReactExampleIndex === undefined) throw new Error('ReactExampleIndex was not generated');`
			: ''
	]
		.filter(Boolean)
		.join('\n');

	const routes = frontendConfigurations
		.map(({ name, directory }, index) => {
			const routePath = index === 0 ? '/' : `/${name}`;
			if (name === 'html') {
				return `.get('${routePath}', () => handleHTMLPageRequest(\`${buildDirectory}/${directory}/pages/HtmlExample.html\`))`;
			}
			if (name === 'react') {
				return `.get('${routePath}', () => handleReactPageRequest(ReactExample, ReactExampleIndex))`;
			}

			return '';
		})
		.filter(Boolean)
		.join('\n  ');

	const serverFileContent = `${importLines.join('\n')}\n\n${manifestDeclaration}\n\n${guardStatements}\n\nnew Elysia()${routes}\n${useStatements.map((s) => `  ${s}`).join('\n')}\n  .on('error', (err) => {\n    const { request } = err;\n    console.error(\`Server error on \${request.method} \${request.url}: \${err.message}\`);\n  });\n`;

	writeFileSync(serverFilePath, serverFileContent);
};
