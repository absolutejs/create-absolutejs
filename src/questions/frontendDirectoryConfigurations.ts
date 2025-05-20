import { text, isCancel } from '@clack/prompts';
import { availableFrontends } from '../data';
import type { FrontendConfiguration } from '../types';
import { abort } from '../utils/abort';

export const getFrontendDirectoryConfigurations = async (
	configType: 'custom' | 'default',
	frontends: string[]
) => {
	let frontendConfigurations: FrontendConfiguration[];
	const single = frontends.length === 1;

	if (configType === 'custom') {
		frontendConfigurations = await frontends.reduce<
			Promise<FrontendConfiguration[]>
		>(async (prevP, frontend) => {
			const prev = await prevP;
			const pretty = availableFrontends[frontend]?.name ?? frontend;
			const base = single ? '' : `${frontend}`;
			const defDir = base;

			const frontendDirectory = await text({
				message: `${pretty} directory:`,
				placeholder: defDir
			});
			if (isCancel(frontendDirectory)) abort();

			return [
				...prev,
				{ directory: frontendDirectory, frontend, name: frontend }
			];
		}, Promise.resolve([]));
	} else {
		frontendConfigurations = frontends.map((frontend) => ({
			directory: single ? '' : frontend,
			frontend,
			name: frontend
		}));
	}

	return frontendConfigurations;
};
