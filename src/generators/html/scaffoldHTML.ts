import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { ScaffoldFrontendProps } from '../../types';

type ScaffoldHTMLProps = ScaffoldFrontendProps & {
	useHTMLScripts: boolean;
};

export const scaffoldHTML = ({
	isSingleFrontend,
	targetDirectory,
	useHTMLScripts,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldHTMLProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'HTML5_Badge.svg'),
		join(projectAssetsDirectory, 'svg', 'HTML5_Badge.svg')
	);
	cpSync(join(templatesDirectory, 'html'), targetDirectory, {
		recursive: true
	});

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'html-example.css');
	const htmlCSS = generateMarkupCSS(isSingleFrontend);
	writeFileSync(cssOutputFile, htmlCSS, 'utf-8');
};
