import { copyFileSync, cpSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { HTMLScriptOption } from '../../types';

type ScaffoldHTMLProps = {
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
	stylesDirectory: string;
	htmlScriptOption: HTMLScriptOption;
};

export const scaffoldHTML = ({
	templatesDirectory,
	isSingle,
	targetDirectory,
	stylesDirectory,
	htmlScriptOption
}: ScaffoldHTMLProps) => {
	const htmlTemplates = join(templatesDirectory, 'html');
	cpSync(join(htmlTemplates, 'pages'), join(targetDirectory, 'pages'), {
		recursive: true
	});

	const scriptsDir = join(targetDirectory, 'scripts');
	mkdirSync(scriptsDir);
	switch (htmlScriptOption) {
		case 'js':
			copyFileSync(
				join(htmlTemplates, 'scripts', 'javascriptExample.js'),
				join(scriptsDir, 'javascriptExample.js')
			);
			break;
		case 'ts':
			copyFileSync(
				join(htmlTemplates, 'scripts', 'typescriptExample.ts'),
				join(scriptsDir, 'typescriptExample.ts')
			);
			break;
		case 'js+ssr':
			copyFileSync(
				join(htmlTemplates, 'scripts', 'javascriptSSRExample.js'),
				join(scriptsDir, 'javascriptSSRExample.js')
			);
			break;
		case 'ts+ssr':
			copyFileSync(
				join(htmlTemplates, 'scripts', 'typescriptSSRExample.ts'),
				join(scriptsDir, 'typescriptSSRExample.ts')
			);
			break;
	}

	const htmlStylesSrc = join(htmlTemplates, 'styles');
	if (isSingle) {
		cpSync(htmlStylesSrc, stylesDirectory, { recursive: true });
	} else {
		const dest = join(stylesDirectory, 'html');
		mkdirSync(dest);
		cpSync(htmlStylesSrc, dest, { recursive: true });
	}
};
