import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import {
	generateAngularPage,
	generateAppComponent,
	generateAppComponentCss,
	generateAppComponentHtml,
	generateCounterComponent,
	generateDropdownComponent
} from './generateAngularPage';

export const scaffoldAngular = ({
	editBasePath,
	isSingleFrontend,
	targetDirectory,
	frontends,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'angular.svg'),
		join(projectAssetsDirectory, 'svg', 'angular.svg')
	);

	const componentsDirectory = join(targetDirectory, 'components');
	mkdirSync(componentsDirectory, { recursive: true });

	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });

	const stylesDirectory = join(targetDirectory, 'styles');
	mkdirSync(stylesDirectory, { recursive: true });

	writeFileSync(
		join(pagesDirectory, 'angular-example.ts'),
		generateAngularPage(frontends),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'dropdown.component.ts'),
		generateDropdownComponent(frontends),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'app.component.ts'),
		generateAppComponent(),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'app.component.html'),
		generateAppComponentHtml(frontends, editBasePath),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'app.component.css'),
		generateAppComponentCss(),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'counter.component.ts'),
		generateCounterComponent(),
		'utf-8'
	);

	const angularCSS = generateMarkupCSS(
		'angular',
		'#dd0031',
		isSingleFrontend
	);

	const customElementCSS = `
/* Flex wrappers for Angular custom elements */
angular-page {
	display: flex;
	flex: 1;
	flex-direction: column;
}

app-root {
	display: flex;
	flex: 1;
	flex-direction: column;
}`;

	writeFileSync(
		join(stylesDirectory, 'angular-example.css'),
		angularCSS + customElementCSS,
		'utf-8'
	);
};
