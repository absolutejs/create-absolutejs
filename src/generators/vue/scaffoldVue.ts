import { cpSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateVuePage } from './generateVuePage';

type ScaffoldVueProps = Omit<ScaffoldFrontendProps, 'isSingleFrontend'>;

export const scaffoldVue = ({
	editBasePath,
	includeExamples,
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory,
	stylesIndexesDirectory
}: ScaffoldVueProps) => {
	const cssOutputFile = join(stylesIndexesDirectory, 'vue-example.css');
	const pagesDirectory = join(targetDirectory, 'pages');

	if (!includeExamples) {
		mkdirSync(pagesDirectory, { recursive: true });
		writeFileSync(
			join(pagesDirectory, 'VueExample.vue'),
			generateVuePage(frontends, editBasePath, false),
			'utf-8'
		);
		writeFileSync(cssOutputFile, `@import url('../reset.css');`, 'utf-8');

		return;
	}

	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'vue-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'vue-logo.svg')
	);
	cpSync(join(templatesDirectory, 'vue'), targetDirectory, {
		recursive: true
	});

	const vuePage = generateVuePage(frontends, editBasePath, true);
	mkdirSync(pagesDirectory, { recursive: true });
	const vueFilePath = join(pagesDirectory, 'VueExample.vue');
	writeFileSync(vueFilePath, vuePage, 'utf-8');

	const vueCSS = generateMarkupCSS('vue', '#42b883');
	writeFileSync(cssOutputFile, vueCSS, 'utf-8');
};
