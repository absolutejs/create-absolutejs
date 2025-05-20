import { execSync } from 'child_process';
import { exit } from 'process';

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
	const commands: Record<string, string> = {
		bun: 'bun install',
		npm: 'npm install',
		pnpm: 'pnpm install',
		yarn: 'yarn install'
	};
	const cmd = commands[packageManager] ?? 'bun install';

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
