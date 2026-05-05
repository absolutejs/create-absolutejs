import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateSveltePage } from './generateSveltePage';

export const scaffoldSvelte = ({
	editBasePath,
	targetDirectory,
	frontends,
	templatesDirectory,
	projectAssetsDirectory,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'svelte-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'svelte-logo.svg')
	);
	cpSync(join(templatesDirectory, 'svelte'), targetDirectory, {
		recursive: true
	});

	const sveltePage = generateSveltePage(frontends, editBasePath);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const svelteFilePath = join(pagesDirectory, 'SvelteExample.svelte');
	writeFileSync(svelteFilePath, sveltePage, 'utf-8');

	const cssOutputFile = join(stylesIndexesDirectory, 'svelte-example.css');
	const svelteCSS = `@import url('../reset.css');`;
	writeFileSync(cssOutputFile, svelteCSS, 'utf-8');
};
