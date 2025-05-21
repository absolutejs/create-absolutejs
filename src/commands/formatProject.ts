import { execSync } from 'child_process';
import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { formatCommands } from '../utils/commandMaps';

type FormatProjectProps = {
	projectName: string;
	packageManager: string;
};

export const formatProject = ({
	projectName,
	packageManager
}: FormatProjectProps) => {
	const spin = spinner();

	try {
		const fmt = formatCommands[packageManager] ?? 'bun run format';
		spin.start('Formatting files…');
		execSync(fmt, { cwd: projectName, stdio: 'pipe' });
		spin.stop('Files formatted');
	} catch (err) {
		spin.stop('Failed to format files');
		console.error('Error formatting:', err);
		exit(1);
	}
};
