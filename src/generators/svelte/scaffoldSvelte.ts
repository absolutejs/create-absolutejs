import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateSveltePage } from './generateSveltePage';

export const scaffoldSvelte = ({
	editBasePath,
	includeExamples,
	targetDirectory,
	frontends,
	templatesDirectory,
	projectAssetsDirectory,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	const pagesDirectory = join(targetDirectory, 'pages');
	const cssOutputFile = join(stylesIndexesDirectory, 'svelte-example.css');
	const svelteCSS = `@import url('../reset.css');`;

	if (!includeExamples) {
		mkdirSync(pagesDirectory, { recursive: true });
		writeFileSync(
			join(pagesDirectory, 'SvelteExample.svelte'),
			generateSveltePage(frontends, editBasePath, false),
			'utf-8'
		);
		writeFileSync(cssOutputFile, svelteCSS, 'utf-8');

		return;
	}

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'svelte-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'svelte-logo.svg')
	);
	cpSync(join(templatesDirectory, 'svelte'), targetDirectory, {
		recursive: true
	});

	const sveltePage = generateSveltePage(frontends, editBasePath, true);
	mkdirSync(pagesDirectory, { recursive: true });
	const svelteFilePath = join(pagesDirectory, 'SvelteExample.svelte');
	writeFileSync(svelteFilePath, sveltePage, 'utf-8');

	writeFileSync(cssOutputFile, svelteCSS, 'utf-8');
};
