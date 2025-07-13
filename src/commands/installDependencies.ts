import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { PackageManager } from '../types';
import { installCommands } from '../utils/commandMaps';

export const installDependencies = async (
	packageManager: PackageManager,
	projectName: string
) => {
	const spin = spinner();
	const cmd = installCommands[packageManager];

	try {
		spin.start('Installing dependencies…');
		await $`sh -c ${cmd}`.cwd(projectName).quiet();
		spin.stop(green('Dependencies installed'));
	} catch (err) {
		spin.stop(red('Installation failed'), 1);
		console.error('Error installing dependencies:', err);
		exit(1);
	}
};
