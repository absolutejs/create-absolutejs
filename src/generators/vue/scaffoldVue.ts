import { cpSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateMarkupCSS } from '../project/generateMarkupCSS';
import { generateVuePage } from './generateVuePage';

type ScaffoldVueProps = Omit<ScaffoldFrontendProps, 'isSingleFrontend'>;

export const scaffoldVue = ({
	editBasePath,
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory,
	stylesIndexesDirectory
}: ScaffoldVueProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'vue-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'vue-logo.svg')
	);
	cpSync(join(templatesDirectory, 'vue'), targetDirectory, {
		recursive: true
	});

	const vuePage = generateVuePage(frontends, editBasePath);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const vueFilePath = join(pagesDirectory, 'VueExample.vue');
	writeFileSync(vueFilePath, vuePage, 'utf-8');

	const cssOutputFile = join(stylesIndexesDirectory, 'vue-example.css');
	const vueCSS = generateMarkupCSS('vue', '#42b883');
	writeFileSync(cssOutputFile, vueCSS, 'utf-8');
};
