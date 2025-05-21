import { mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import type { FrontendConfiguration, HTMLScriptOption } from '../types';
import { createHTML } from './project/html/createHTML';
import { createReact } from './project/react/createReact';

type CreateFrontendsProps = {
	frontendDirectory: string;
	templatesDirectory: string;
	frontendConfigurations: FrontendConfiguration[];
	htmlScriptOption: HTMLScriptOption;
};

export const createFrontends = ({
	frontendDirectory,
	templatesDirectory,
	frontendConfigurations,
	htmlScriptOption
}: CreateFrontendsProps) => {
	const isSingle = frontendConfigurations.length === 1;
	const stylesDirectory = join(frontendDirectory, 'styles');
	mkdirSync(stylesDirectory);

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
		mkdirSync(targetDirectory);

		if (name === 'react') {
			createReact({
				isSingle,
				stylesDirectory,
				targetDirectory,
				templatesDirectory
			});
		}

		if (name === 'html') {
			createHTML({
				isSingle,
				stylesDirectory,
				targetDirectory,
				templatesDirectory
			});
		}
	});
};
