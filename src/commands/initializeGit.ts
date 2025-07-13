import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';

export const initializeGit = async (projectName: string) => {
	const spin = spinner();

	try {
		spin.start('Initializing git repository…');

		await $`git init -b main`.cwd(projectName).quiet();
		await $`git add -A`.cwd(projectName).quiet();
		await $`git commit -m "Initial commit"`.cwd(projectName).quiet();

		spin.stop(green('Git repo initialized'));
	} catch (err) {
		spin.stop(red('Failed to initialize git'), 1);
		throw err;
	}
};
