import { confirm, isCancel } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getIncludeExamples = async () => {
	const includeExamples = await confirm({
		initialValue: true,
		message: 'Include example pages and components?'
	});
	if (isCancel(includeExamples)) abort();

	return includeExamples;
};
