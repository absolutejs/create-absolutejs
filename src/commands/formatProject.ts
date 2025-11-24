import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, yellow } from 'picocolors';
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
		await $`sh -c ${fmt}`.cwd(projectName).quiet().nothrow();
		spin.stop(green('Files formatted'));
	} catch {
		spin.stop(yellow('Formatting skipped - continuing...'), 0);
	}
};
