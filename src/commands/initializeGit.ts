import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { green, red } from 'picocolors';
import { abort } from '../utils/abort';
import { checkGitInstalled } from '../utils/checkGitInstalled';

const initializeRepository = async (projectName: string, spin: ReturnType<typeof spinner>) => {
	spin.stop();
	spin.start('Initializing git repository…');

	await $`git init -b main`.cwd(projectName).quiet();
	await $`git add -A`.cwd(projectName).quiet();
	await $`git commit -m "Initial commit"`.cwd(projectName).quiet();

	spin.stop(green('Git repo initialized'));
};

export const initializeGit = async (projectName: string) => {
	const spin = spinner();

	try {
		spin.start('Checking git availability...');
		const isGitInstalled = await checkGitInstalled();
		
		if (!isGitInstalled) {
			spin.stop(red('Git is not installed. Please install git before proceeding.'), 1);
			abort();
		}

		await initializeRepository(projectName, spin);
	} catch (err) {
		spin.stop(red('Failed to initialize git'), 1);
		throw err;
	}
};
