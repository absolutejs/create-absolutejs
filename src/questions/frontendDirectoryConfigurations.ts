import process from 'node:process';

import { isCancel, text } from '@clack/prompts';
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
	isSingleFrontend: boolean,
	providedValue?: string
) => {
	if (directoryConfiguration !== 'custom')
		return isSingleFrontend ? '' : frontend;

	// If value is already provided, use it
	if (providedValue !== undefined)
		return providedValue;

	// Use default based on placeholder (for non-interactive mode)
	// This prevents hanging when --skip is used with --directory custom
	const defaultValue = isSingleFrontend ? '' : frontend;

	// Check if we're in a non-interactive environment (no TTY or stdin not available)
	// If so, return default instead of prompting to prevent hangs
	const isNonInteractive = !process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.readable;
	if (isNonInteractive) {
		return defaultValue;
	}

	// Only prompt in interactive mode
	const response = await text({
		message: `${frontendLabels[frontend]} directory:`,
		placeholder: defaultValue
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

	const processFrontend = (frontend: Frontend) => {
		const prefilled = passedFrontendDirectories?.[frontend];
		if (prefilled !== undefined) {
			frontendDirectories[frontend] = prefilled;

			return;
		}

		if (directoryConfiguration === 'custom') {
			frontendsToPrompt.push(frontend);

			return;
		}

		const defaultValue = isSingleFrontend ? '' : frontend;
		frontendDirectories[frontend] = defaultValue;
	};

	for (const frontend of frontends) {
		processFrontend(frontend);
	}

	// Only prompt if there are frontends that need prompting (shouldn't happen with --skip)
	if (frontendsToPrompt.length === 0) {
		return frontendDirectories;
	}

	const promptedDirectories = await Promise.all(
		frontendsToPrompt.map((name) =>
			getDirectoryForFrontend(
				directoryConfiguration,
				name,
				isSingleFrontend,
				passedFrontendDirectories?.[name]
			)
		)
	);

	frontendsToPrompt.forEach(
		(name, index) =>
			(frontendDirectories[name] = promptedDirectories[index])
	);

	return frontendDirectories;
};
