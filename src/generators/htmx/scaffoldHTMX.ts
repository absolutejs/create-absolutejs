import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Glob } from 'bun';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateHTMXPage } from './generateHTMXPage';

export const scaffoldHTMX = ({
	editBasePath,
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory,
	frontends,
	isSingleFrontend,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'htmx-logo-black.svg'),
		join(projectAssetsDirectory, 'svg', 'htmx-logo-black.svg')
	);
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'htmx-logo-white.svg'),
		join(projectAssetsDirectory, 'svg', 'htmx-logo-white.svg')
	);

	const glob = new Glob('htmx*.min.js');
	for (const relativePath of glob.scanSync({
		cwd: join(templatesDirectory, 'htmx')
	})) {
		const src = join(templatesDirectory, 'htmx', relativePath);
		const dest = join(targetDirectory, 'htmx.min.js');
		copyFileSync(src, dest);
		break;
	}

	const htmxPage = generateHTMXPage(
		isSingleFrontend,
		frontends,
		editBasePath
	);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const htmxFilePath = join(pagesDirectory, 'HTMXExample.html');
	writeFileSync(htmxFilePath, htmxPage, 'utf-8');

	const cssOutputFile = join(stylesIndexesDirectory, 'htmx-example.css');
	const htmxCSS = generateMarkupCSS('htmx', '#3465a4');
	writeFileSync(cssOutputFile, htmxCSS, 'utf-8');
};
