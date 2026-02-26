import { exit } from 'node:process';
import { spinner } from '@clack/prompts';
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
	const fmt = installDependenciesNow
		? formatCommands[packageManager]
		: formatNoInstallCommands[packageManager];
	const parts = fmt.split(/\s+/);
	const bin = parts[0];
	if (bin === undefined) throw new Error('Empty format command');
	const args = parts.slice(1);

	try {
		spin.start('Formatting files…');
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
		spin.stop(green('Files formatted'));
	} catch (err) {
		spin.cancel(red('Failed to format files'));
		console.error('Error formatting:', err);
		exit(1);
	}
};
