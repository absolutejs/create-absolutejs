import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';

export const scaffoldSvelte = ({
	isSingleFrontend,
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'svelte-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'svelte-logo.svg')
	);
	cpSync(join(templatesDirectory, 'svelte'), targetDirectory, {
		recursive: true
	});

	const cssOutputDirectory = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDirectory, { recursive: true });

	const cssOutputFile = join(cssOutputDirectory, 'svelte-example.css');
	const svelteCSS = `@import url('${isSingleFrontend ? '../' : '../../'}styles/reset.css');`;
	writeFileSync(cssOutputFile, svelteCSS, 'utf-8');
};
