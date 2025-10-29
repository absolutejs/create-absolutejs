import { $ } from 'bun';

export const checkGitInstalled = async () => {
	try {
		await $`git --version`.quiet();

		return true;
	} catch {
		return false;
	}
};