import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import {
	generateAngularPage,
	generateAngularPageHtml,
	generateAppComponent,
	generateAppComponentCss,
	generateAppComponentHtml,
	generateCounterComponent,
	generateCounterComponentCss,
	generateCounterComponentHtml,
	generateDropdownComponent,
	generateDropdownComponentHtml
} from './generateAngularPage';

export const scaffoldAngular = ({
	editBasePath,
	isSingleFrontend,
	targetDirectory,
	frontends,
	templatesDirectory,
	projectAssetsDirectory,
	stylesDirectory,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'angular.svg'),
		join(projectAssetsDirectory, 'svg', 'angular.svg')
	);

	const componentsDirectory = join(targetDirectory, 'components');
	mkdirSync(componentsDirectory, { recursive: true });

	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });

	const templatesDir = join(targetDirectory, 'templates');
	mkdirSync(templatesDir, { recursive: true });

	writeFileSync(
		join(pagesDirectory, 'angular-example.ts'),
		generateAngularPage(frontends),
		'utf-8'
	);

	writeFileSync(
		join(templatesDir, 'angular-example.html'),
		generateAngularPageHtml(),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'dropdown.component.ts'),
		generateDropdownComponent(frontends),
		'utf-8'
	);

	writeFileSync(
		join(templatesDir, 'dropdown.component.html'),
		generateDropdownComponentHtml(frontends),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'app.component.ts'),
		generateAppComponent(isSingleFrontend),
		'utf-8'
	);

	writeFileSync(
		join(templatesDir, 'app.component.html'),
		generateAppComponentHtml(frontends, editBasePath),
		'utf-8'
	);

	writeFileSync(
		join(stylesDirectory, 'app.component.css'),
		generateAppComponentCss(),
		'utf-8'
	);

	writeFileSync(
		join(componentsDirectory, 'counter.component.ts'),
		generateCounterComponent(isSingleFrontend),
		'utf-8'
	);

	writeFileSync(
		join(templatesDir, 'counter.component.html'),
		generateCounterComponentHtml(),
		'utf-8'
	);

	writeFileSync(
		join(stylesDirectory, 'counter.component.css'),
		generateCounterComponentCss(),
		'utf-8'
	);

	const angularCSS = generateMarkupCSS('angular', '#dd0031');

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
		join(stylesIndexesDirectory, 'angular-example.css'),
		angularCSS + customElementCSS,
		'utf-8'
	);
};
