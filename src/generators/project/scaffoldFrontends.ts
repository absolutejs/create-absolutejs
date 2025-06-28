import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CreateConfiguration } from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';
import { scaffoldReact } from '../react/scaffoldReact';

type ScaffoldFrontendsProps = Pick<
	CreateConfiguration,
	'frontendDirectories' | 'htmlScriptOption' | 'tailwind'
> & {
	frontendDirectory: string;
	templatesDirectory: string;
};

export const scaffoldFrontends = ({
	frontendDirectory,
	templatesDirectory,
	frontendDirectories,
	tailwind,
	htmlScriptOption
}: ScaffoldFrontendsProps) => {
	const isSingleFrontend = Object.keys(frontendDirectories).length === 1;
	const stylesDirectory = join(frontendDirectory, 'styles');
	mkdirSync(stylesDirectory);

	if (tailwind !== undefined) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.css'),
			join(stylesDirectory, 'tailwind.css')
		);
	}

	const dirMap = new Map<string, string>();

	Object.entries(frontendDirectories).forEach(([name, directory]) => {
		const dir = directory?.trim() ?? (isSingleFrontend ? '' : name);

		if (dirMap.has(dir)) {
			throw new Error(
				`Frontend directory collision: "${dir}" is assigned to both "${dirMap.get(
					dir
				)}" and "${name}". Please pick unique directories.`
			);
		}
		dirMap.set(dir, name);

		const targetDirectory = join(frontendDirectory, dir);
		if (!isSingleFrontend) mkdirSync(targetDirectory);

		if (name === 'react') {
			scaffoldReact({
				isSingleFrontend,
				stylesDirectory,
				targetDirectory,
				templatesDirectory
			});
		}

		if (name === 'html') {
			scaffoldHTML({
				htmlScriptOption,
				isSingleFrontend,
				targetDirectory
			});
		}
	});
};
