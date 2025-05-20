import { text, isCancel } from '@clack/prompts';
import { abort } from '../utils/abort';

export const getDirectoryConfiguration = async (
	configType: 'custom' | 'default',
	useTailwind: boolean
) => {
	let tailwind: { input: string; output: string } | undefined;
	let buildDir: string;
	let assetsDir: string;

	// Build directory
	if (configType === 'custom') {
		const _buildDir = await text({
			message: 'Build directory:',
			placeholder: 'build'
		});
		if (isCancel(_buildDir)) abort();
		buildDir = _buildDir;
	} else {
		buildDir = 'build';
	}

	// Assets directory
	if (configType === 'custom') {
		const _assetsDir = await text({
			message: 'Assets directory:',
			placeholder: 'src/backend/assets'
		});
		if (isCancel(_assetsDir)) abort();
		assetsDir = _assetsDir;
	} else {
		assetsDir = 'src/backend/assets';
	}

	// Tailwind
	if (useTailwind) {
		const input =
			configType === 'custom'
				? await text({
						message: 'Tailwind input CSS file:',
						placeholder: './example/styles/tailwind.css'
					})
				: './example/styles/tailwind.css';
		if (isCancel(input)) abort();

		const output =
			configType === 'custom'
				? await text({
						message: 'Tailwind output CSS file:',
						placeholder: '/assets/css/tailwind.generated.css'
					})
				: '/assets/css/tailwind.generated.css';
		if (isCancel(output)) abort();

		tailwind = { input, output };
	}

	return {
		assetsDir,
		buildDir,
		tailwind
	};
};
