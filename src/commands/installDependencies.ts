import { execSync } from 'child_process';
import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { green, red } from 'picocolors';
import { installCommands } from '../utils/commandMaps';

type InstallDependenciesProps = {
	projectName: string;
	packageManager: string;
};

export const installDependencies = async ({
	projectName,
	packageManager
}: InstallDependenciesProps) => {
	const spin = spinner();
	const cmd = installCommands[packageManager] ?? 'bun install';

	try {
		spin.start('Installing dependencies…');
		execSync(cmd, { cwd: projectName, stdio: 'pipe' });
		spin.stop(green('Dependencies installed'));
	} catch (err) {
		spin.stop(red('Installation failed'), 1);
		console.error('Error installing dependencies:', err);
		exit(1);
	}
};
