import { text, isCancel } from '@clack/prompts';
import { frontendLabels } from '../data';
import type {
	DirectoryConfiguration,
	Frontend,
	FrontendDirectories
} from '../types';
import { abort } from '../utils/abort';

const getDirectoryForFrontend = async (
	directoryConfiguration: DirectoryConfiguration,
	frontend: Frontend,
	isSingleFrontend: boolean
) => {
	if (directoryConfiguration !== 'custom')
		return isSingleFrontend ? '' : frontend;

	const response = await text({
		message: `${frontendLabels[frontend]} directory:`,
		placeholder: isSingleFrontend ? '' : frontend
	});
	if (isCancel(response)) abort();

	return response;
};

export const getFrontendDirectoryConfigurations = async (
	directoryConfiguration: DirectoryConfiguration,
	frontends: Frontend[],
	passedFrontendDirectories: Partial<Record<Frontend, string>> | undefined
) => {
	const isSingleFrontend = frontends.length === 1;
	const frontendDirectories: FrontendDirectories = {};
	const frontendsToPrompt: Frontend[] = [];

	for (const frontend of frontends) {
		const prefilled = passedFrontendDirectories?.[frontend];
		if (prefilled === undefined) frontendsToPrompt.push(frontend);
		else frontendDirectories[frontend] = prefilled;
	}

	const promptedDirectories = await Promise.all(
		frontendsToPrompt.map((name) =>
			getDirectoryForFrontend(
				directoryConfiguration,
				name,
				isSingleFrontend
			)
		)
	);

	frontendsToPrompt.forEach(
		(name, index) =>
			(frontendDirectories[name] = promptedDirectories[index])
	);

	return frontendDirectories;
};
