import { writeFileSync } from 'fs';
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

type CreateServerFileProps = {
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
	const custom = availablePlugins.filter((p) => plugins.includes(p.value));
	const authPlugin =
		authProvider === 'absoluteAuth' ? [absoluteAuthPlugin] : [];
	const allDeps = defaultDependencies.concat(
		defaultPlugins,
		custom,
		authPlugin
	);

	const uniqueDeps = allDeps
		.reduce<AvailableDependency[]>(
			(dependenciesAccumulator, dependency) => {
				const isAlreadyIncluded = dependenciesAccumulator.some(
					(existingDependency) =>
						existingDependency.value === dependency.value
				);
				if (!isAlreadyIncluded) {
					dependenciesAccumulator.push(dependency);
				}

				return dependenciesAccumulator;
			},
			[]
		)
		.sort((firstDependency, secondDependency) =>
			firstDependency.value.localeCompare(secondDependency.value)
		);

	// group imports by package
	const importLines = uniqueDeps
		.map((dep) => {
			const names = dep.imports.map((i) => i.packageName).join(', ');

			return `import { ${names} } from '${dep.value}';`;
		})
		.join('\n');

	const uses = uniqueDeps
		.flatMap((dep) =>
			dep.imports
				.filter((i) => i.isPlugin)
				.map((i) => {
					const pluginName = i.packageName;
					if (i.config === undefined) {
						return `\t.use(${pluginName})`;
					} else if (i.config === null) {
						return `\t.use(${pluginName}())`;
					}

					return `\t.use(${pluginName}(${JSON.stringify(i.config)}))`;
				})
		)
		.join('\n');

	const buildStep = `const manifest = build({
\t\tbuildDir: '${buildDir}',
\t\tassetsDir: '${assetsDir}',
\t\treact: '${frontendConfigurations.find((f) => f.name === 'react')?.directory}',
\t\tvueDir: '${frontendConfigurations.find((f) => f.name === 'vue')?.directory}',
\t\tangularDir: '${frontendConfigurations.find((f) => f.name === 'angular')?.directory}',
\t\tsvelteDir: '${frontendConfigurations.find((f) => f.name === 'svelte')?.directory}',
\t\tastroDir: '${frontendConfigurations.find((f) => f.name === 'astro')?.directory}',
\t\thtmlDir: '${frontendConfigurations.find((f) => f.name === 'html')?.directory}',
\t\thtmxDir: '${frontendConfigurations.find((f) => f.name === 'htmx')?.directory}',
\t\ttailwind: ${tailwind ? JSON.stringify(tailwind) : 'undefined'},
})`;

	const content = `\
${importLines}

${buildStep}

new Elysia()
\t.get('/', () => 'Hello, world!')
${uses}
\t.on("error", (error) => {
\t\tconst { request } = error
\t\tconsole.error(\`Server error on \${request.method} \${request.url}: \${error.message}\`)
\t})`;

	writeFileSync(serverFilePath, content);
};
