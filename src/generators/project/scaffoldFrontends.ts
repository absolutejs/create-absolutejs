import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
	FrontendConfiguration,
	HTMLScriptOption,
	Language,
	TailwindConfig
} from '../../types';
import { scaffoldHTML } from '../html/scaffoldHTML';
import { scaffoldReact } from '../react/scaffoldReact';

type ScaffoldFrontendsProps = {
	frontendDirectory: string;
	templatesDirectory: string;
	frontendConfigurations: FrontendConfiguration[];
	htmlScriptOption: HTMLScriptOption;
	tailwind: TailwindConfig;
	language: Language;
};

export const scaffoldFrontends = ({
	frontendDirectory,
	language,
	templatesDirectory,
	frontendConfigurations,
	tailwind,
	htmlScriptOption
}: ScaffoldFrontendsProps) => {
	const isSingle = frontendConfigurations.length === 1;
	const stylesDirectory = join(frontendDirectory, 'styles');
	mkdirSync(stylesDirectory);

	if (tailwind !== undefined) {
		copyFileSync(
			join(templatesDirectory, 'tailwind', 'tailwind.css'),
			join(stylesDirectory, 'tailwind.css')
		);
	}

	const dirMap = new Map<string, string>();
	frontendConfigurations.forEach(({ name, directory }) => {
		const dir = directory?.trim() ?? (isSingle ? '' : name);

		if (dirMap.has(dir)) {
			throw new Error(
				`Frontend directory collision: "${dir}" is assigned to both "${dirMap.get(
					dir
				)}" and "${name}". Please pick unique directories.`
			);
		}
		dirMap.set(dir, name);

		const targetDirectory = join(frontendDirectory, dir);
		void (!isSingle && mkdirSync(targetDirectory));

		if (name === 'react') {
			scaffoldReact({
				isSingle,
				stylesDirectory,
				targetDirectory,
				templatesDirectory
			});
		}

		if (name === 'html') {
			scaffoldHTML({
				htmlScriptOption,
				isSingle,
				language,
				targetDirectory,
				templatesDirectory
			});
		}
	});
};
