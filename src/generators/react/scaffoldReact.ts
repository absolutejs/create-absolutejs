import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';

export const scaffoldReact = ({
	isSingleFrontend,
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'react.svg'),
		join(projectAssetsDirectory, 'svg', 'react.svg')
	);
	cpSync(join(templatesDirectory, 'react'), targetDirectory, {
		recursive: true
	});

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'react-example.css');
	const reactCSS = generateMarkupCSS(isSingleFrontend);
	writeFileSync(cssOutputFile, reactCSS, 'utf-8');
};
