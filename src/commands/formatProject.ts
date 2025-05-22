import { execSync } from 'child_process';
import { exit } from 'process';
import { spinner } from '@clack/prompts';
import { green, red } from 'picocolors';
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
		spin.stop(green('Files formatted'));
	} catch (err) {
		spin.stop(red('Failed to format files'), 1);
		console.error('Error formatting:', err);
		exit(1);
	}
};
