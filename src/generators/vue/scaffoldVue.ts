import { cpSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';
import { generateVuePage } from './generateVuePage';

type ScaffoldVueProps = Omit<ScaffoldFrontendProps, 'isSingleFrontend'>;

export const scaffoldVue = ({
	targetDirectory,
	templatesDirectory,
	frontends,
	projectAssetsDirectory
}: ScaffoldVueProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'vue-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'vue-logo.svg')
	);
	cpSync(join(templatesDirectory, 'vue'), targetDirectory, {
		recursive: true
	});

	const vuePage = generateVuePage(frontends);
	const pagesDirectory = join(targetDirectory, 'pages');
	mkdirSync(pagesDirectory, { recursive: true });
	const vueFilePath = join(pagesDirectory, 'VueExample.vue');
	writeFileSync(vueFilePath, vuePage, 'utf-8');
};
