import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CreateConfiguration } from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';
import { scaffoldReact } from '../react/scaffoldReact';
import { scaffoldSvelte } from '../svelte/scaffoldSvelte';

type ScaffoldFrontendsProps = Pick<
	CreateConfiguration,
	'frontendDirectories' | 'htmlScriptOption' | 'tailwind' | 'language'
> & {
	frontendDirectory: string;
	templatesDirectory: string;
};

export const scaffoldFrontends = ({
	frontendDirectory,
	templatesDirectory,
	frontendDirectories,
	language,
	tailwind,
	htmlScriptOption
}: ScaffoldFrontendsProps) => {
	const frontendEntries = Object.entries(frontendDirectories);
	const isSingleFrontend = frontendEntries.length === 1;

	const stylesDirectory = join(frontendDirectory, 'styles');
	const needsStylesDir = !(
		isSingleFrontend && frontendEntries[0]?.[0] === 'svelte'
	);

	if (needsStylesDir) mkdirSync(stylesDirectory);
	if (needsStylesDir && tailwind !== undefined) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.css'),
			join(stylesDirectory, 'tailwind.css')
		);
	}

	const directoryMap = new Map<string, string>();

	for (const [frontendName, rawDirectory] of frontendEntries) {
		const directory =
			rawDirectory?.trim() ?? (isSingleFrontend ? '' : frontendName);

		if (directoryMap.has(directory)) {
			throw new Error(
				`Frontend directory collision: "${directory}" is assigned to both "${directoryMap.get(
					directory
				)}" and "${frontendName}". Please pick unique directories.`
			);
		}
		directoryMap.set(directory, frontendName);

		const targetDirectory = join(frontendDirectory, directory);
		if (!isSingleFrontend) mkdirSync(targetDirectory);

		switch (frontendName) {
			case 'react':
				scaffoldReact({
					isSingleFrontend,
					stylesDirectory,
					targetDirectory,
					templatesDirectory
				});
				break;
			case 'svelte':
				scaffoldSvelte({ language, targetDirectory });
				break;
			case 'html':
				scaffoldHTML({
					htmlScriptOption,
					isSingleFrontend,
					targetDirectory
				});
				break;
		}
	}
};
