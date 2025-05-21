import { mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import type { FrontendConfiguration, HTMLScriptOption } from '../types';
import { createReact } from './createReact';

type CreateFrontendsProps = {
	frontendDir: string;
	templatesDir: string;
	frontendConfigurations: FrontendConfiguration[];
	htmlScriptOption: HTMLScriptOption;
};

export const createFrontends = ({
	frontendDir,
	templatesDir,
	frontendConfigurations,
	htmlScriptOption
}: CreateFrontendsProps) => {
	const isSingle = frontendConfigurations.length === 1;

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

		const targetDir = join(frontendDir, dir);
		mkdirSync(targetDir, { recursive: true });

		if (name === 'react') {
			createReact({ frontendDir, isSingle, targetDir, templatesDir });
		}

		if (name === 'html') {
			const htmlTemplates = join(templatesDir, 'html');
			cpSync(join(htmlTemplates, 'pages'), join(targetDir, 'pages'), {
				recursive: true
			});
			cpSync(join(htmlTemplates, 'styles'), join(targetDir, 'styles'), {
				recursive: true
			});
			const scriptsDir = join(targetDir, 'scripts');
			mkdirSync(scriptsDir, { recursive: true });
			// TODO: copy file here
		}
	});
};
