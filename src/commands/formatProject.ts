import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { PackageManager } from '../types';
import { formatCommands, formatNoInstallCommands } from '../utils/commandMaps';

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
	const spin = spinner();

	try {
		const fmt = installDependenciesNow
			? formatCommands[packageManager]
			: formatNoInstallCommands[packageManager];

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
