import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

type CreateReactProps = {
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
	stylesDirectory: string;
};

export const createHTML = ({
	templatesDirectory,
	isSingle,
	targetDirectory,
	stylesDirectory
}: CreateReactProps) => {
	const htmlTemplates = join(templatesDirectory, 'html');
	cpSync(join(htmlTemplates, 'pages'), join(targetDirectory, 'pages'), {
		recursive: true
	});

	const scriptsDir = join(targetDirectory, 'scripts');
	mkdirSync(scriptsDir, { recursive: true });
	// TODO: copy file here

	const htmlStylesSrc = join(htmlTemplates, 'styles');
	if (isSingle) {
		mkdirSync(stylesDirectory, { recursive: true });
		cpSync(htmlStylesSrc, stylesDirectory, { recursive: true });
	} else {
		const dest = join(stylesDirectory, 'html', 'defaults');
		mkdirSync(dest, { recursive: true });
		cpSync(htmlStylesSrc, dest, { recursive: true });
	}
};
