import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

type CreateReactProps = {
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
	stylesDirectory: string;
};

export const scaffoldHTML = ({
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
	mkdirSync(scriptsDir);
	// TODO: copy file here

	const htmlStylesSrc = join(htmlTemplates, 'styles');
	if (isSingle) {
		mkdirSync(stylesDirectory);
		cpSync(htmlStylesSrc, stylesDirectory, { recursive: true });
	} else {
		const dest = join(stylesDirectory, 'html');
		mkdirSync(dest);
		cpSync(htmlStylesSrc, dest, { recursive: true });
	}
};
