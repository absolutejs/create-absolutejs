import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type CreateReactProps = {
	frontendDir: string;
	templatesDir: string;
	isSingle: boolean;
	targetDir: string;
};

export const createReact = ({
	frontendDir,
	templatesDir,
	isSingle,
	targetDir
}: CreateReactProps) => {
	const reactStylesSrc = join(templatesDir, 'react', 'styles');
	const stylesDir = join(frontendDir, 'styles');
	const reactTemplates = join(templatesDir, 'react');

	cpSync(join(reactTemplates, 'pages'), join(targetDir, 'pages'), {
		recursive: true
	});
	cpSync(join(reactTemplates, 'components'), join(targetDir, 'components'), {
		recursive: true
	});
	cpSync(join(reactTemplates, 'hooks'), join(targetDir, 'hooks'), {
		recursive: true
	});

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
