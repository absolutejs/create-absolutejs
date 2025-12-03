import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateDropdownComponent } from './generateAngularPage';

export const scaffoldAngular = ({
	isSingleFrontend,
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'angular.svg'),
		join(projectAssetsDirectory, 'svg', 'angular.svg')
	);
	cpSync(join(templatesDirectory, 'angular'), targetDirectory, {
		recursive: true
	});

	const dropdownComponent = generateDropdownComponent(frontends);
	writeFileSync(
		join(targetDirectory, 'components', 'dropdown.component.ts'),
		dropdownComponent,
		'utf-8'
	);

	const cssOutputDir = join(targetDirectory, 'styles');
	mkdirSync(cssOutputDir, { recursive: true });

	const cssOutputFile = join(cssOutputDir, 'angular-example.css');
	const angularCSS = generateMarkupCSS('angular', '#dd0031aa', isSingleFrontend);
	writeFileSync(cssOutputFile, angularCSS, 'utf-8');
};

