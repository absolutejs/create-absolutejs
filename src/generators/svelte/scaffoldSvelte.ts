import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateSveltePage } from './generateSveltePage';

export const scaffoldSvelte = ({
	isSingleFrontend,
	targetDirectory,
	frontends,
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

	const sveltePage = generateSveltePage(frontends);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const svelteFilePath = join(pagesDirectory, 'SvelteExample.svelte');
	writeFileSync(svelteFilePath, sveltePage, 'utf-8');

	const cssOutputDirectory = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDirectory, { recursive: true });

	const cssOutputFile = join(cssOutputDirectory, 'svelte-example.css');
	const svelteCSS = `@import url('${isSingleFrontend ? '../' : '../../'}styles/reset.css');`;
	writeFileSync(cssOutputFile, svelteCSS, 'utf-8');
};
