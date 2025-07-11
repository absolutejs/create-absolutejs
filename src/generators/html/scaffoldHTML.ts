import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateHTMLCSS } from './generateHTMLCSS';

type ScaffoldHTMLProps = {
	isSingleFrontend: boolean;
	targetDirectory: string;
	useHTMLScripts: boolean;
	templatesDirectory: string;
	projectAssetsDirectory: string;
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
	const htmlCSS = generateHTMLCSS(isSingleFrontend);
	writeFileSync(cssOutputFile, htmlCSS, 'utf-8');
};
