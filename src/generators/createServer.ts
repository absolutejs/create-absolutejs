import { writeFileSync } from 'fs';
import { UNFOUND_INDEX } from '../constants';
import {
	absoluteAuthPlugin,
	defaultDependencies,
	defaultPlugins
} from '../data';
import type {
	AuthProvier,
	AvailableDependency,
	FrontendConfiguration,
	TailwindConfig
} from '../types';

export type CreateServerFileProps = {
	tailwind: TailwindConfig;
	frontendConfigurations: FrontendConfiguration[];
	serverFilePath: string;
	availablePlugins: AvailableDependency[];
	authProvider: AuthProvier;
	plugins: string[];
	buildDir: string;
	assetsDir: string;
};

export const createServerFile = ({
	tailwind,
	frontendConfigurations,
	serverFilePath,
	authProvider,
	availablePlugins,
	buildDir,
	assetsDir,
	plugins
}: CreateServerFileProps) => {
	const customPlugins = availablePlugins.filter(
		(plugin) => plugins.indexOf(plugin.value) !== UNFOUND_INDEX
	);
	const authenticationPluginList: AvailableDependency[] = [];
	if (authProvider === 'absoluteAuth') {
		authenticationPluginList.push(absoluteAuthPlugin);
	}
	let combinedDependencies = defaultDependencies.concat(defaultPlugins);
	combinedDependencies = combinedDependencies.concat(customPlugins);
	combinedDependencies = combinedDependencies.concat(
		authenticationPluginList
	);
	const uniqueDependencies: AvailableDependency[] = [];
	combinedDependencies.forEach((dependency) => {
		const existsInList = uniqueDependencies.some(
			(existing) => existing.value === dependency.value
		);
		if (!existsInList) {
			uniqueDependencies.push(dependency);
		}
	});
	uniqueDependencies.sort((first, second) =>
		first.value.localeCompare(second.value)
	);
	const importStatementLines: string[] = [];
	uniqueDependencies.forEach((dependency) => {
		const importNames = dependency.imports
			.map((i) => i.packageName)
			.join(', ');
		importStatementLines.push(
			`import { ${importNames} } from '${dependency.value}';`
		);
	});

	const pluginItems = uniqueDependencies
		.flatMap((dep) => dep.imports)
		.filter((item) => item.isPlugin);

	const pluginUseStatements = pluginItems.map((item) => {
		if (item.config === undefined) return `.use(${item.packageName})`;
		if (item.config === null) return `.use(${item.packageName}())`;

		return `.use(${item.packageName}(${JSON.stringify(item.config)}))`;
	});

	const manifestOptionList: string[] = [];
	manifestOptionList.push(`buildDirectory: '${buildDir}'`);
	manifestOptionList.push(`assetsDirectory: '${assetsDir}'`);
	const frameworkNames = [
		'react',
		'vue',
		'angular',
		'svelte',
		'astro',
		'html',
		'htmx'
	];
	frameworkNames.forEach((frameworkName) => {
		const cfg = frontendConfigurations.find(
			(c) => c.name === frameworkName
		);
		if (cfg && cfg.directory !== undefined) {
			const prop =
				frameworkName === 'html' ? 'html' : `${frameworkName}Directory`;
			manifestOptionList.push(`${prop}: '${cfg.directory}'`);
		}
	});

	if (tailwind) {
		manifestOptionList.push(`tailwind: ${JSON.stringify(tailwind)}`);
	}
	const buildStep = `const manifest = build({\n  ${manifestOptionList.join(
		',\n  '
	)}\n});`;
	let fileContent = `${importStatementLines.join('\n')}\n\n${
		buildStep
	}\n\nnew Elysia()\n  .get('/', () => 'Hello, world!')`;
	pluginUseStatements.forEach((useStatement) => {
		fileContent = `${fileContent}\n  ${useStatement}`;
	});
	fileContent = `${
		fileContent
	}\n  .on('error', (error) => { const { request } = error; console.error(\`Server error on \${request.method} \${request.url}: \${error.message}\`); });\n`;
	writeFileSync(serverFilePath, fileContent);
};
