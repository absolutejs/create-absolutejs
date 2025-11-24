import type { ArgumentConfiguration, CreateConfiguration } from '../types';

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
							'/assets/css/tailwind.generated.css'
					}
				: undefined
		};
	}

	// Build directory - use default if not provided (non-interactive mode)
	const buildDirectory =
		argumentConfiguration.buildDirectory ?? 'build';

	// Assets directory - use default if not provided (non-interactive mode)
	const assetsDirectory =
		argumentConfiguration.assetsDirectory ?? 'src/backend/assets';

	// Tailwind directory - use defaults if not provided (non-interactive mode)
	let tailwind;
	if (useTailwind) {
		const input =
			argumentConfiguration.tailwind?.input ??
			'./src/frontend/styles/tailwind.css';

		const output =
			argumentConfiguration.tailwind?.output ??
			'/assets/css/tailwind.generated.css';

		tailwind = { input, output };
	} else {
		tailwind = undefined;
	}

	// Database - use default if not provided (non-interactive mode)
	let databaseDirectory;
	if (databaseEngine !== undefined && databaseEngine !== 'none') {
		databaseDirectory =
			argumentConfiguration.databaseDirectory ?? 'db';
	}

	return {
		assetsDirectory,
		buildDirectory,
		databaseDirectory,
		tailwind
	};
};
