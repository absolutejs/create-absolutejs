import { text, isCancel } from '@clack/prompts';
import type { DatabaseDialect } from '../types';
import { abort } from '../utils/abort';

type GetDirectoryConfigurationProps = {
	configType: 'custom' | 'default';
	useTailwind: boolean;
	databaseDialect: DatabaseDialect;
};

export const getDirectoryConfiguration = async ({
	configType,
	useTailwind,
	databaseDialect
}: GetDirectoryConfigurationProps) => {
	if (configType === 'default') {
		return {
			assetsDirectory: 'src/backend/assets',
			buildDirectory: 'build',
			databaseDirectory: databaseDialect && 'db',
			tailwind: useTailwind
				? {
						input: './example/styles/tailwind.css',
						output: '/assets/css/tailwind.generated.css'
					}
				: undefined
		};
	}

	// Build directory
	const buildDirectory = await text({
		message: 'Build directory:',
		placeholder: 'build'
	});
	if (isCancel(buildDirectory)) abort();

	// Assets directory
	const assetsDirectory = await text({
		message: 'Assets directory:',
		placeholder: 'src/backend/assets'
	});
	if (isCancel(assetsDirectory)) abort();

	// Tailwind directory
	let tailwind;
	if (useTailwind) {
		const input = await text({
			message: 'Tailwind input CSS file:',
			placeholder: './example/styles/tailwind.css'
		});
		if (isCancel(input)) abort();

		const output = await text({
			message: 'Tailwind output CSS file:',
			placeholder: '/assets/css/tailwind.generated.css'
		});
		if (isCancel(output)) abort();

		tailwind = { input, output };
	} else {
		tailwind = undefined;
	}

	// Database
	let databaseDirectory;
	if (databaseDialect !== undefined) {
		databaseDirectory = await text({
			message: 'Database directory:',
			placeholder: 'db'
		});
		if (isCancel(databaseDirectory)) abort();
	}

	return {
		assetsDirectory,
		buildDirectory,
		databaseDirectory,
		tailwind
	};
};
