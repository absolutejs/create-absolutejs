import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateHTMLPage } from './generateHTMLPage';

type ScaffoldHTMLProps = ScaffoldFrontendProps & {
	useHTMLScripts: boolean;
};

export const scaffoldHTML = ({
	isSingleFrontend,
	targetDirectory,
	frontends,
	useHTMLScripts,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldHTMLProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'HTML5_Badge.svg'),
		join(projectAssetsDirectory, 'svg', 'HTML5_Badge.svg')
	);

	const htmlPage = generateHTMLPage(frontends, useHTMLScripts);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const htmlFilePath = join(pagesDirectory, 'HTMLExample.html');
	writeFileSync(htmlFilePath, htmlPage, 'utf-8');

	const scriptsDirectory = join(targetDirectory, 'scripts');
	cpSync(join(templatesDirectory, 'html', 'scripts'), scriptsDirectory, {
		recursive: true
	});

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'html-example.css');
	const htmlCSS = generateMarkupCSS('html', '#e34f26', isSingleFrontend);
	writeFileSync(cssOutputFile, htmlCSS, 'utf-8');
};
