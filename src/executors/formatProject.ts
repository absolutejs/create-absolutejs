import { execSync } from 'child_process';
import { exit } from 'process';
import { formatCommands } from '../utils/commandMaps';

type FormatProjectProps = {
	projectName: string;
	packageManager: string;
	spinner: {
		start: (msg?: string) => void;
		stop: (msg?: string, code?: number) => void;
		message: (msg?: string) => void;
	};
};

export const formatProject = ({
	projectName,
	packageManager,
	spinner
}: FormatProjectProps) => {
	try {
		const fmt = formatCommands[packageManager] ?? 'bun run format';
		spinner.start('Formatting files…');
		execSync(fmt, { cwd: projectName, stdio: 'pipe' });
		spinner.stop('Files formatted');
	} catch (err) {
		spinner.stop('Failed to format files');
		console.error('Error formatting:', err);
		exit(1);
	}
};
