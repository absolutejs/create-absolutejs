import { cpSync, copyFileSync } from 'fs';
import { join } from 'path';
import { ScaffoldFrontendProps } from '../../types';

type ScaffoldVueProps = Omit<ScaffoldFrontendProps, 'isSingleFrontend'>;

export const scaffoldVue = ({
	targetDirectory,
	templatesDirectory,
	projectAssetsDirectory
}: ScaffoldVueProps) => {
	copyFileSync(
		join(templatesDirectory, 'assets', 'svg', 'vue-logo.svg'),
		join(projectAssetsDirectory, 'svg', 'vue-logo.svg')
	);
	cpSync(join(templatesDirectory, 'vue'), targetDirectory, {
		recursive: true
	});
};
