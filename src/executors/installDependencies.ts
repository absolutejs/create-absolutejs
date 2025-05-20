import { execSync } from 'child_process';
import { exit } from 'process';

export const installDependencies = async (
	projectName: string,
	packageManager: string,
	spinner: {
		start: (msg?: string) => void;
		stop: (msg?: string, code?: number) => void;
		message: (msg?: string) => void;
	}
) => {
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

		const formatCmds: Record<string, string> = {
			bun: 'bun run format',
			npm: 'npm run format',
			pnpm: 'pnpm run format',
			yarn: 'yarn format'
		};
		const fmt = formatCmds[packageManager] ?? 'bun run format';
		spinner.start('Formatting files…');
		execSync(fmt, { cwd: projectName, stdio: 'pipe' });
		spinner.stop('Files formatted');
	} catch (err) {
		spinner.stop('Installation failed');
		console.error('Error installing dependencies or formatting:', err);
		exit(1);
	}
};
