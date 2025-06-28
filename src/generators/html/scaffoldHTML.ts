import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { HTMLScriptOption } from '../../types';
import { generateHTMLPage } from './generateHTMLPage';
import { getHTMLScript } from './generateHTMLScript';

type ScaffoldHTMLProps = {
	isSingleFrontend: boolean;
	targetDirectory: string;
	htmlScriptOption: HTMLScriptOption;
};

export const scaffoldHTML = ({
	isSingleFrontend,
	targetDirectory,
	htmlScriptOption
}: ScaffoldHTMLProps) => {
	const htmlPage = generateHTMLPage(htmlScriptOption);
	const htmlPagesDirectory = join(targetDirectory, 'pages');

	mkdirSync(htmlPagesDirectory, { recursive: true });
	writeFileSync(join(htmlPagesDirectory, 'HTMLExample.html'), htmlPage);

	if (htmlScriptOption !== undefined && htmlScriptOption !== 'none') {
		const scriptsDir = join(targetDirectory, 'scripts');
		mkdirSync(scriptsDir, { recursive: true });
		const script = getHTMLScript(htmlScriptOption, isSingleFrontend);
		const scriptFileName =
			htmlScriptOption === 'ts'
				? 'typescriptExample.ts'
				: 'javascriptExample.js';
		writeFileSync(join(scriptsDir, scriptFileName), script);
	}
};
