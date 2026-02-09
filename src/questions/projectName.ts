import { isCancel, text } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getProjectName = async () => {
	const projectName = await text({
		message: 'Project name:',
		placeholder: 'absolutejs-project'
	});

	if (isCancel(projectName)) abort();

	return projectName || 'absolutejs-project';
};
