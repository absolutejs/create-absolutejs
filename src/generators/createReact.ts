import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const createReact = (
	frontendDir: string,
	templatesDir: string,
	isSingle: boolean
) => {
	const reactStylesSrc = join(templatesDir, 'react', 'styles');
	const stylesDir = join(frontendDir, 'styles');

	if (isSingle) {
		cpSync(reactStylesSrc, stylesDir, {
			recursive: true
		});
	}

	if (!isSingle) {
		const dest = join(stylesDir, 'react', 'defaults');
		mkdirSync(dest, { recursive: true });
		cpSync(join(reactStylesSrc, 'default'), dest, {
			recursive: true
		});
	}
};
