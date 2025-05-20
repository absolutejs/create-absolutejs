import { execSync } from 'child_process';
import { exit } from 'process';
import { installCommands } from '../utils/commandMaps';

type InstallDependenciesProps = {
	projectName: string;
	packageManager: string;
	spinner: {
		start: (msg?: string) => void;
		stop: (msg?: string, code?: number) => void;
		message: (msg?: string) => void;
	};
};

export const installDependencies = async ({
	projectName,
	packageManager,
	spinner
}: InstallDependenciesProps) => {
	const cmd = installCommands[packageManager] ?? 'bun install';

	try {
		spinner.start('Installing dependencies…');
		execSync(cmd, { cwd: projectName, stdio: 'pipe' });
		spinner.stop('Dependencies installed');
	} catch (err) {
		spinner.stop('Installation failed');
		console.error('Error installing dependencies:', err);
		exit(1);
	}
};
