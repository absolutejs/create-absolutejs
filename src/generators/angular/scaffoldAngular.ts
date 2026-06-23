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
	includeExamples,
	isSingleFrontend,
	targetDirectory,
	frontends,
	templatesDirectory,
	projectAssetsDirectory,
	stylesDirectory,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	const pagesDirectory = join(targetDirectory, 'pages');
	const templatesDir = join(targetDirectory, 'templates');

	if (!includeExamples) {
		mkdirSync(pagesDirectory, { recursive: true });
		mkdirSync(templatesDir, { recursive: true });

		writeFileSync(
			join(pagesDirectory, 'angular-example.ts'),
			generateAngularPage(frontends, false),
			'utf-8'
		);
		writeFileSync(
			join(templatesDir, 'angular-example.html'),
			generateAngularPageHtml(false),
			'utf-8'
		);
		writeFileSync(
			join(stylesIndexesDirectory, 'angular-example.css'),
			`@import url('../reset.css');\n\nangular-page {\n\tdisplay: flex;\n\tflex: 1;\n\tflex-direction: column;\n}\n`,
			'utf-8'
		);

		return;
	}

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'angular.svg'),
		join(projectAssetsDirectory, 'svg', 'angular.svg')
	);

	const componentsDirectory = join(targetDirectory, 'components');
	mkdirSync(componentsDirectory, { recursive: true });

	mkdirSync(pagesDirectory, { recursive: true });

	mkdirSync(templatesDir, { recursive: true });

	writeFileSync(
		join(pagesDirectory, 'angular-example.ts'),
		generateAngularPage(frontends, true),
		'utf-8'
	);

	writeFileSync(
		join(templatesDir, 'angular-example.html'),
		generateAngularPageHtml(true),
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
