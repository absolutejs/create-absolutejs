import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { green, red } from 'picocolors';
import { PackageManager } from '../types';
import { installCommands } from '../utils/commandMaps';

export const installDependencies = async (
	packageManager: PackageManager,
	projectName: string
) => {
	const spin = spinner();
	const cmd = installCommands[packageManager];
	const parts = cmd.split(/\s+/);
	const bin = parts[0];
	if (bin === undefined) throw new Error('Empty install command');
	const args = parts.slice(1);

	try {
		spin.start('Installing dependencies');
		const proc = Bun.spawnSync([bin, ...args], {
			cwd: projectName,
			stderr: 'pipe',
			stdout: 'ignore'
		});
		if (!proc.success) {
			const errMsg =
				proc.stderr?.toString().trim() ?? `Exit code ${proc.exitCode}`;
			throw new Error(errMsg);
		}
		spin.stop(green('Dependencies installed'));
	} catch (err) {
		spin.cancel(red('Installation failed'));
		console.error('Error installing dependencies:', err);
		exit(1);
	}
};
