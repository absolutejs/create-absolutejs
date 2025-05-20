import { mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import type { FrontendConfiguration } from '../types';
import { createReact } from './createReact';

type CreateFrontendsProps = {
	frontendDir: string;
	templatesDir: string;
	frontendConfigurations: FrontendConfiguration[];
};

export const createFrontends = ({
	frontendDir,
	templatesDir,
	frontendConfigurations
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
			const reactTemplates = join(templatesDir, 'react');
			cpSync(join(reactTemplates, 'pages'), join(targetDir, 'pages'), {
				recursive: true
			});
			cpSync(
				join(reactTemplates, 'components'),
				join(targetDir, 'components'),
				{ recursive: true }
			);
			cpSync(join(reactTemplates, 'hooks'), join(targetDir, 'hooks'), {
				recursive: true
			});
		}
	});

	if (frontendConfigurations.some((f) => f.name === 'react')) {
		createReact(frontendDir, templatesDir, isSingle);
	}
};
