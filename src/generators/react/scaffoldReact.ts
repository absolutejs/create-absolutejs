import { generateReactCSS } from './generateReactCSS';
import { join } from 'path';
import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { ScaffoldFrontendProps } from '../../types';

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
	const reactCSS = generateReactCSS(isSingleFrontend);
	writeFileSync(cssOutputFile, reactCSS, 'utf-8');
};
