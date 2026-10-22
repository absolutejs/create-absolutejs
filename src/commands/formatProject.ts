import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, yellow } from 'picocolors';
import { PackageManager } from '../types';
import { formatCommands } from '../utils/commandMaps';

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
	// A no-install scaffold must be fully offline and must not assume a global
	// formatter. Templates are already formatted in the published package.
	if (!installDependenciesNow) return;

	const spin = spinner();

	try {
		const fmt = formatCommands[packageManager];

		spin.start('Formatting files…');
		const [bin, ...args] = fmt.split(' ');
		await $`${bin} ${args}`.cwd(projectName).quiet();
		spin.stop(green('Files formatted'));
	} catch (err) {
		// The project is complete without formatting: `absolute fmt` needs Bun
		// 1.4.4+, so an older Bun skips this step with its own explanation.
		spin.stop(yellow('Files not formatted'));
		const detail =
			err && typeof err === 'object' && 'stderr' in err
				? String(err.stderr).trim()
				: String(err);
		if (detail) console.warn(detail);
	}
};
