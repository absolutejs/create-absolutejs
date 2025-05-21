import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type CreateReactProps = {
	stylesDirectory: string;
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
};

export const createReact = ({
	stylesDirectory,
	templatesDirectory,
	isSingle,
	targetDirectory
}: CreateReactProps) => {
	const reactStylesSrc = join(templatesDirectory, 'react', 'styles');
	const reactTemplates = join(templatesDirectory, 'react');

	cpSync(join(reactTemplates, 'pages'), join(targetDirectory, 'pages'), {
		recursive: true
	});
	cpSync(
		join(reactTemplates, 'components'),
		join(targetDirectory, 'components'),
		{
			recursive: true
		}
	);
	cpSync(join(reactTemplates, 'hooks'), join(targetDirectory, 'hooks'), {
		recursive: true
	});

	if (isSingle) {
		cpSync(reactStylesSrc, stylesDirectory, {
			recursive: true
		});
	} else {
		const dest = join(stylesDirectory, 'react', 'defaults');
		mkdirSync(dest, { recursive: true });
		cpSync(reactStylesSrc, dest, {
			recursive: true
		});
	}
};
