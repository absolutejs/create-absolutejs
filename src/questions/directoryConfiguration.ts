import { text, isCancel } from '@clack/prompts';
import type { ArgumentConfiguration, CreateConfiguration } from '../types';
import { abort } from '../utils/abort';
import { orPrompt } from '../utils/interactive';

const orPromptText = (options: Parameters<typeof text>[0]) =>
	orPrompt(`a value for "${String(options.message)}" (pass the matching --*-dir flag)`, () => text(options));

type GetDirectoryConfigurationProps = Pick<
	CreateConfiguration,
	'directoryConfig' | 'useTailwind' | 'databaseEngine'
> & {
	argumentConfiguration: ArgumentConfiguration;
};

export const getDirectoryConfiguration = async ({
	directoryConfig,
	useTailwind,
	databaseEngine,
	argumentConfiguration
}: GetDirectoryConfigurationProps) => {
	if (directoryConfig === 'default') {
		return {
			assetsDirectory:
				argumentConfiguration.assetsDirectory ?? 'src/backend/assets',
			buildDirectory: argumentConfiguration.buildDirectory ?? 'build',
			databaseDirectory:
				databaseEngine !== undefined && databaseEngine !== 'none'
					? (argumentConfiguration.databaseDirectory ?? 'db')
					: undefined,
			tailwind: useTailwind
				? {
						input:
							argumentConfiguration.tailwind?.input ??
							'./src/frontend/styles/tailwind.css',
						output:
							argumentConfiguration.tailwind?.output ??
							'assets/css/tailwind.generated.css'
					}
				: undefined
		};
	}

	// Build directory
	const buildDirectory =
		argumentConfiguration.buildDirectory ??
		(await orPromptText({
			message: 'Build directory:',
			placeholder: 'build'
		}));
	if (isCancel(buildDirectory)) abort();

	// Assets directory
	const assetsDirectory =
		argumentConfiguration.assetsDirectory ??
		(await orPromptText({
			message: 'Assets directory:',
			placeholder: 'src/backend/assets'
		}));
	if (isCancel(assetsDirectory)) abort();

	// Tailwind directory
	let tailwind;
	if (useTailwind) {
		const input =
			argumentConfiguration.tailwind?.input ??
			(await orPromptText({
				message: 'Tailwind input CSS file:',
				placeholder: './src/frontend/styles/tailwind.css'
			}));
		if (isCancel(input)) abort();

		const output =
			argumentConfiguration.tailwind?.output ??
			(await orPromptText({
				message: 'Tailwind output CSS file:',
				placeholder: 'assets/css/tailwind.generated.css'
			}));
		if (isCancel(output)) abort();

		tailwind = { input, output };
	} else {
		tailwind = undefined;
	}

	// Database
	let databaseDirectory;
	if (databaseEngine !== undefined && databaseEngine !== 'none') {
		databaseDirectory =
			argumentConfiguration.databaseDirectory ??
			(await orPromptText({
				message: 'Database directory:',
				placeholder: 'db'
			}));
		if (isCancel(databaseDirectory)) abort();
	}

	return {
		assetsDirectory,
		buildDirectory,
		databaseDirectory,
		tailwind
	};
};
