import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CreateConfiguration } from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';
import { generateReactCSS } from '../react/generateReactCSS';
import { scaffoldReact } from '../react/scaffoldReact';
import { scaffoldSvelte } from '../svelte/scaffoldSvelte';
import { scaffoldVue } from '../vue/scaffoldVue';
import { scaffoldHTMX } from '../htmx/scaffoldHTMX';

type ScaffoldFrontendsProps = Pick<
	CreateConfiguration,
	'useHTMLScripts' | 'frontendDirectories'
> & {
	frontendDirectory: string;
	templatesDirectory: string;
	projectAssetsDirectory: string;
};

export const scaffoldFrontends = ({
	frontendDirectory,
	templatesDirectory,
	projectAssetsDirectory,
	useHTMLScripts,
	frontendDirectories
}: ScaffoldFrontendsProps) => {
	const stylesTargetDirectory = join(frontendDirectory, 'styles');
	cpSync(join(templatesDirectory, 'styles'), stylesTargetDirectory, {
		recursive: true
	});

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
					isSingleFrontend,
					targetDirectory,
					templatesDirectory,
					projectAssetsDirectory
				});
				break;
			case 'svelte':
				scaffoldSvelte({
					isSingleFrontend,
					targetDirectory,
					templatesDirectory,
					projectAssetsDirectory
				});
				break;
			case 'vue':
				scaffoldVue({
					targetDirectory,
					templatesDirectory,
					projectAssetsDirectory
				});
				break;
			case 'angular':
				console.warn(
					'Angular is not yet supported. Refer to the documentation for more information.'
				);
				break;
			case 'html':
				scaffoldHTML({
					isSingleFrontend,
					projectAssetsDirectory,
					targetDirectory,
					templatesDirectory,
					useHTMLScripts
				});
				break;
			case 'htmx':
				scaffoldHTMX({
					targetDirectory,
					templatesDirectory,
					projectAssetsDirectory,
					isSingleFrontend
				});
				break;
		}
	}
};
