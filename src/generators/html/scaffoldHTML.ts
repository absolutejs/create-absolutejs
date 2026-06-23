import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateHTMLPage } from './generateHTMLPage';

type ScaffoldHTMLProps = ScaffoldFrontendProps & {
	useHTMLScripts: boolean;
};

export const scaffoldHTML = ({
	editBasePath,
	includeExamples,
	isSingleFrontend,
	targetDirectory,
	frontends,
	useHTMLScripts,
	templatesDirectory,
	projectAssetsDirectory,
	stylesIndexesDirectory
}: ScaffoldHTMLProps) => {
	const pagesDirectory = join(targetDirectory, 'pages');
	const cssOutputFile = join(stylesIndexesDirectory, 'html-example.css');

	if (!includeExamples) {
		mkdirSync(pagesDirectory, { recursive: true });
		writeFileSync(
			join(pagesDirectory, 'HTMLExample.html'),
			generateHTMLPage(
				frontends,
				useHTMLScripts,
				editBasePath,
				isSingleFrontend,
				false
			),
			'utf-8'
		);
		writeFileSync(cssOutputFile, `@import url('../reset.css');`, 'utf-8');

		return;
	}

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'HTML5_Badge.svg'),
		join(projectAssetsDirectory, 'svg', 'HTML5_Badge.svg')
	);

	const htmlPage = generateHTMLPage(
		frontends,
		useHTMLScripts,
		editBasePath,
		isSingleFrontend,
		true
	);
	mkdirSync(pagesDirectory, { recursive: true });
	const htmlFilePath = join(pagesDirectory, 'HTMLExample.html');
	writeFileSync(htmlFilePath, htmlPage, 'utf-8');

	const scriptsDirectory = join(targetDirectory, 'scripts');
	cpSync(join(templatesDirectory, 'html', 'scripts'), scriptsDirectory, {
		recursive: true
	});

	const htmlCSS = generateMarkupCSS('html', '#e34f26');
	writeFileSync(cssOutputFile, htmlCSS, 'utf-8');
};
