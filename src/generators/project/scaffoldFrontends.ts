import { copyFileSync, cpSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CreateConfiguration } from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';
import { scaffoldHTMX } from '../htmx/scaffoldHTMX';
import { scaffoldReact } from '../react/scaffoldReact';
import { scaffoldSvelte } from '../svelte/scaffoldSvelte';
import { scaffoldVue } from '../vue/scaffoldVue';

type ScaffoldFrontendsProps = Pick<
	CreateConfiguration,
	| 'useHTMLScripts'
	| 'frontendDirectories'
	| 'assetsDirectory'
	| 'frontends'
	| 'authOption'
	| 'absProviders'
	| 'useTailwind'
> & {
	frontendDirectory: string;
	templatesDirectory: string;
	projectAssetsDirectory: string;
	typesDirectory: string;
};

export const scaffoldFrontends = ({
	frontendDirectory,
	assetsDirectory,
	absProviders,
	authOption,
	templatesDirectory,
	projectAssetsDirectory,
	typesDirectory,
	useHTMLScripts,
	useTailwind,
	frontendDirectories,
	frontends
}: ScaffoldFrontendsProps) => {
	const stylesTargetDirectory = join(frontendDirectory, 'styles');
	cpSync(join(templatesDirectory, 'styles'), stylesTargetDirectory, {
		recursive: true
	});

	if (useTailwind) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.css'),
			join(stylesTargetDirectory, 'tailwind.css')
		);
	}

	const frontendEntries = Object.entries(frontendDirectories);
	const isSingleFrontend = frontendEntries.length === 1;

	const directoryMap = new Map<string, string>();

	for (const [frontendName, rawDirectory] of frontendEntries) {
		const directory =
			rawDirectory?.trim() ?? (isSingleFrontend ? '' : frontendName);

		if (directoryMap.has(directory)) {
			throw new Error(
				`Frontend directory collision: "${directory}" is assigned to both "${directoryMap.get(
					directory
				)}" and "${frontendName}". Please pick unique directories.`
			);
		}
		directoryMap.set(directory, frontendName);

		const targetDirectory = join(frontendDirectory, directory);
		if (!isSingleFrontend) mkdirSync(targetDirectory);

		switch (frontendName) {
			case 'react':
				scaffoldReact({
					absProviders,
					assetsDirectory,
					authOption,
					frontends,
					isSingleFrontend,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory
				});
				break;
			case 'svelte':
				scaffoldSvelte({
					absProviders,
					assetsDirectory,
					authOption,
					frontends,
					isSingleFrontend,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory
				});
				break;
			case 'vue':
				scaffoldVue({
					absProviders,
					assetsDirectory,
					authOption,
					frontends,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory
				});
				copyFileSync(
					join(templatesDirectory, 'types', 'vue-shim.d.ts'),
					join(typesDirectory, 'vue-shim.d.ts')
				);
				break;
			case 'angular':
				console.warn(
					'Angular is not yet supported. Refer to the documentation for more information.'
				);
				break;
			case 'html':
				scaffoldHTML({
					absProviders,
					assetsDirectory,
					authOption,
					frontends,
					isSingleFrontend,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory,
					useHTMLScripts
				});
				break;
			case 'htmx':
				scaffoldHTMX({
					absProviders,
					assetsDirectory,
					authOption,
					frontends,
					isSingleFrontend,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory
				});
				break;
		}
	}
};
