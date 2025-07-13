import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Glob } from 'bun';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateHTMXPage } from './generateHTMXPage';

export const scaffoldHTMX = ({
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory,
	frontends,
	isSingleFrontend
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

	const htmxPage = generateHTMXPage(isSingleFrontend, frontends);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const htmxFilePath = join(pagesDirectory, 'HTMXExample.html');
	writeFileSync(htmxFilePath, htmxPage, 'utf-8');

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'htmx-example.css');
	const htmxCSS = generateMarkupCSS('htmx', '#3465a4', isSingleFrontend);
	writeFileSync(cssOutputFile, htmxCSS, 'utf-8');
};
