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
	| 'htmlScriptOption'
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
	htmlScriptOption,
	buildDirectory,
	assetsDirectory,
	plugins
}: CreateServerFileProps) => {
	const customPlugins = availablePlugins.filter(
		(plugin) => plugins.indexOf(plugin.value) !== UNFOUND_INDEX
	);
	const authenticationPluginList: AvailableDependency[] = [];
	if (authProvider === 'absoluteAuth') {
		authenticationPluginList.push(absoluteAuthPlugin);
	}

	const combinedDependencies = defaultDependencies
		.concat(defaultPlugins)
		.concat(customPlugins)
		.concat(authenticationPluginList);

	const uniqueDependencies: AvailableDependency[] = [];
	combinedDependencies.forEach((dependency) => {
		if (!uniqueDependencies.some((d) => d.value === dependency.value)) {
			uniqueDependencies.push(dependency);
		}
	});
	uniqueDependencies.sort((a, b) => a.value.localeCompare(b.value));

	const importStatementLines = uniqueDependencies.flatMap((dependency) =>
		dependency.imports.length
			? [
					`import { ${dependency.imports
						.map((i) => i.packageName)
						.join(', ')} } from '${dependency.value}';`
				]
			: []
	);

	const pluginUseStatements = uniqueDependencies
		.flatMap((dependency) => dependency.imports)
		.filter((importEntry) => importEntry.isPlugin)
		.map((importEntry) => {
			const { packageName, config } = importEntry;
			if (config === undefined) return `.use(${packageName})`;
			if (config === null) return `.use(${packageName}())`;

			return `.use(${packageName}(${JSON.stringify(config)}))`;
		});

	const manifestOptionList: string[] = [
		`buildDirectory: '${buildDirectory}'`,
		`assetsDirectory: '${assetsDirectory}'`
	];

	frontendConfigurations.forEach(({ name, directory }) => {
		if (directory !== undefined) {
			manifestOptionList.push(
				`${name}Directory: './src/frontend/${directory}'`
			);
		}
	});

	if (tailwind) {
		manifestOptionList.push(`tailwind: ${JSON.stringify(tailwind)}`);
	}

	const buildStep = `const manifest = await build({\n  ${manifestOptionList.join(
		',\n  '
	)}\n});`;

	let fileContent = `${importStatementLines.join('\n')}\n\n${buildStep}\n\nnew Elysia()\n  .get('/', () => 'Hello, world!')`;

	pluginUseStatements.forEach((useStatement) => {
		fileContent += `\n  ${useStatement}`;
	});

	fileContent += `\n  .on('error', (error) => { const { request } = error; console.error(\`Server error on \${request.method} \${request.url}: \${error.message}\`); });\n`;

	writeFileSync(serverFilePath, fileContent);
};
