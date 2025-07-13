import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateDropdownComponent } from './generateReactPage';

export const scaffoldReact = ({
	isSingleFrontend,
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'react.svg'),
		join(projectAssetsDirectory, 'svg', 'react.svg')
	);
	cpSync(join(templatesDirectory, 'react'), targetDirectory, {
		recursive: true
	});

	const dropdownComponent = generateDropdownComponent(frontends);
	writeFileSync(
		join(targetDirectory, 'components', 'Dropdown.tsx'),
		dropdownComponent,
		'utf-8'
	);

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'react-example.css');
	const reactCSS = generateMarkupCSS('react', '#61dafbaa', isSingleFrontend);
	writeFileSync(cssOutputFile, reactCSS, 'utf-8');
};
