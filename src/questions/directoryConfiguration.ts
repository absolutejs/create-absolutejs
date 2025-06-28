import { text, isCancel } from '@clack/prompts';
import type { ArgumentConfiguration, CreateConfiguration } from '../types';
import { abort } from '../utils/abort';

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
			assetsDirectory: 'src/backend/assets',
			buildDirectory: 'build',
			databaseDirectory: databaseEngine && 'db',
			tailwind: useTailwind
				? {
						input: './src/frontend/styles/tailwind.css',
						output: '/assets/css/tailwind.generated.css'
					}
				: undefined
		};
	}

	// Build directory
	const buildDirectory =
		argumentConfiguration.buildDirectory ??
		(await text({
			message: 'Build directory:',
			placeholder: 'build'
		}));
	if (isCancel(buildDirectory)) abort();

	// Assets directory
	const assetsDirectory =
		argumentConfiguration.assetsDirectory ??
		(await text({
			message: 'Assets directory:',
			placeholder: 'src/backend/assets'
		}));
	if (isCancel(assetsDirectory)) abort();

	// Tailwind directory
	let tailwind;
	if (useTailwind) {
		const input =
			argumentConfiguration.tailwind?.input ??
			(await text({
				message: 'Tailwind input CSS file:',
				placeholder: './src/frontend/styles/tailwind.css'
			}));
		if (isCancel(input)) abort();

		const output =
			argumentConfiguration.tailwind?.output ??
			(await text({
				message: 'Tailwind output CSS file:',
				placeholder: '/assets/css/tailwind.generated.css'
			}));
		if (isCancel(output)) abort();

		tailwind = { input, output };
	} else {
		tailwind = undefined;
	}

	// Database
	let databaseDirectory;
	if (databaseEngine !== undefined) {
		databaseDirectory =
			argumentConfiguration.databaseDirectory ??
			(await text({
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
