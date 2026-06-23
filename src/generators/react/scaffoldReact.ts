import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import {
	generateAppComponent,
	generateDropdownComponent,
	generateReactExamplePage,
	generateSignInComponent
} from './generateReactComponents';

export const scaffoldReact = ({
	authOption,
	editBasePath,
	includeExamples,
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory,
	absProviders,
	stylesIndexesDirectory
}: ScaffoldFrontendProps) => {
	if (!includeExamples) {
		mkdirSync(join(targetDirectory, 'components'), { recursive: true });
		copyFileSync(
			join(templatesDirectory, 'react', 'components', 'Head.tsx'),
			join(targetDirectory, 'components', 'Head.tsx')
		);

		mkdirSync(join(targetDirectory, 'pages'), { recursive: true });
		writeFileSync(
			join(targetDirectory, 'pages', 'ReactExample.tsx'),
			generateReactExamplePage(authOption, false),
			'utf-8'
		);

		writeFileSync(
			join(stylesIndexesDirectory, 'react-example.css'),
			`@import url('../reset.css');`,
			'utf-8'
		);

		return;
	}

	mkdirSync(join(projectAssetsDirectory, 'svg'), { recursive: true });

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'react.svg'),
		join(projectAssetsDirectory, 'svg', 'react.svg')
	);

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'google-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'google-logo.svg')
	);

	cpSync(join(templatesDirectory, 'react'), targetDirectory, {
		recursive: true
	});

	const appComponent = generateAppComponent(frontends, editBasePath);
	writeFileSync(
		join(targetDirectory, 'components', 'App.tsx'),
		appComponent,
		'utf-8'
	);

	const dropdownComponent = generateDropdownComponent(frontends);
	writeFileSync(
		join(targetDirectory, 'components', 'Dropdown.tsx'),
		dropdownComponent,
		'utf-8'
	);

	if (authOption === 'abs') {
		const signInComponent = generateSignInComponent(absProviders);
		writeFileSync(
			join(targetDirectory, 'components', 'SignIn.tsx'),
			signInComponent,
			'utf-8'
		);
	}

	const pageComponent = generateReactExamplePage(authOption, true);
	mkdirSync(join(targetDirectory, 'pages'), { recursive: true });
	writeFileSync(
		join(targetDirectory, 'pages', 'ReactExample.tsx'),
		pageComponent,
		'utf-8'
	);

	const cssOutputFile = join(stylesIndexesDirectory, 'react-example.css');
	const reactCSS = generateMarkupCSS('react', '#61dafbaa');
	writeFileSync(cssOutputFile, reactCSS, 'utf-8');
};
