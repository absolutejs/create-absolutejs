import { confirm, isCancel } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getHtmlScriptingOption = async () => {
	const useScripts = await confirm({
		message: 'Would you like to use scripts for your HTML pages?'
	});
	if (isCancel(useScripts)) abort();

	return useScripts;
};
