import { select, isCancel } from '@clack/prompts';
import { blueBright, yellow } from 'picocolors';
import { abort } from '../utils/abort';

export const getHtmlScriptingOption = async (language: string) => {
	const langLabel =
		language === 'ts' ? blueBright('TypeScript') : yellow('JavaScript');
	const htmlScriptOption = await select({
		message: `Add HTML scripting option (${langLabel}):`,
		options: [
			{ label: `${langLabel} + SSR`, value: `${language}+ssr` },
			{ label: langLabel, value: language },
			{ label: 'None', value: 'none' }
		]
	});
	if (isCancel(htmlScriptOption)) abort();

	return htmlScriptOption === 'none' ? undefined : htmlScriptOption;
};
