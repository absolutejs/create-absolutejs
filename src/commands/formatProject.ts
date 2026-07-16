import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { PackageManager } from '../types';
import { formatCommands } from '../utils/commandMaps';

type FormatProjectProps = {
	projectName: string;
	packageManager: PackageManager;
	installDependenciesNow: boolean;
};

export const formatProject = async ({
	projectName,
	packageManager,
	installDependenciesNow
}: FormatProjectProps) => {
	// A no-install scaffold must be fully offline and must not assume a global
	// formatter. Templates are already formatted in the published package.
	if (!installDependenciesNow) return;

	const spin = spinner();

	try {
		const fmt = formatCommands[packageManager];

		spin.start('Formatting files…');
		const [bin, ...args] = fmt.split(' ');
		await $`${bin} ${args}`.cwd(projectName).quiet();
		spin.stop(green('Files formatted'));
	} catch (err) {
		spin.cancel(red('Failed to format files'));
		console.error('Error formatting:', err);
		exit(1);
	}
};
