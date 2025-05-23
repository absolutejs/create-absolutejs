import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { HTMLScriptOption, Language } from '../../types';
import { getSSRScript } from './getSSRScript';

type ScaffoldHTMLProps = {
	templatesDirectory: string;
	isSingle: boolean;
	targetDirectory: string;
	htmlScriptOption: HTMLScriptOption;
	language: Language;
};

export const scaffoldHTML = ({
	templatesDirectory,
	isSingle,
	targetDirectory,
	htmlScriptOption,
	language
}: ScaffoldHTMLProps) => {
	const htmlTemplates = join(templatesDirectory, 'html');
	cpSync(join(htmlTemplates, 'pages'), join(targetDirectory, 'pages'), {
		recursive: true
	});

	const scriptsDir = join(targetDirectory, 'scripts');
	mkdirSync(scriptsDir);
	if (htmlScriptOption?.includes('ssr')) {
		const ssrScript = getSSRScript(language, isSingle);
		const ssrFileName =
			language === 'ts'
				? 'typescriptSSRExample.ts'
				: 'javascriptSSRExample.js';
		writeFileSync(join(scriptsDir, ssrFileName), ssrScript);
	}
};
