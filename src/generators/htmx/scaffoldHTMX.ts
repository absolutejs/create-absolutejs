import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';

export const scaffoldHTMX = ({
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory,
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
	cpSync(join(templatesDirectory, 'htmx'), targetDirectory, {
		recursive: true
	});

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'htmx-example.css');
	const htmxCSS = generateMarkupCSS(isSingleFrontend);
	writeFileSync(cssOutputFile, htmxCSS, 'utf-8');
};
