import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CreateConfiguration } from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';

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
				copyFileSync(
					join(templatesDirectory, 'assets', 'svg', 'react.svg'),
					join(projectAssetsDirectory, 'svg', 'react.svg')
				);
				cpSync(join(templatesDirectory, 'react'), targetDirectory, {
					recursive: true
				});
				break;
			case 'svelte':
				copyFileSync(
					join(
						templatesDirectory,
						'assets',
						'svg',
						'svelte-logo.svg'
					),
					join(projectAssetsDirectory, 'svg', 'svelte-logo.svg')
				);
				cpSync(join(templatesDirectory, 'svelte'), targetDirectory, {
					recursive: true
				});
				const cssOutputFile = join(
					targetDirectory,
					'styles',
					'svelte-example.css'
				);
				const svelteCSS = `@import url('${isSingleFrontend ? '../' : '../../'}styles/reset.css');`;
				writeFileSync(cssOutputFile, svelteCSS, 'utf-8');
				break;
			case 'vue':
				copyFileSync(
					join(templatesDirectory, 'assets', 'svg', 'vue-logo.svg'),
					join(projectAssetsDirectory, 'svg', 'vue-logo.svg')
				);
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
				copyFileSync(
					join(
						templatesDirectory,
						'assets',
						'svg',
						'htmx-logo-black.svg'
					),
					join(projectAssetsDirectory, 'svg', 'htmx-logo-black.svg')
				);
				copyFileSync(
					join(
						templatesDirectory,
						'assets',
						'svg',
						'htmx-logo-white.svg'
					),
					join(projectAssetsDirectory, 'svg', 'htmx-logo-white.svg')
				);
				break;
		}
	}
};
