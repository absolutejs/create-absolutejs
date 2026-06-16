import { basename } from 'path';
import { spinner } from '@clack/prompts';
import { $ } from 'bun';
import { dim, green, red, yellow } from 'picocolors';
import type { GithubLinkOption } from '../types';

type InitializeGitProps = {
	projectName: string;
	githubLink: GithubLinkOption;
	githubRepoUrl: string | undefined;
	githubVisibility: 'public' | 'private' | undefined;
};

const note = (message: string) =>
	console.log(`${dim('│')}  ${yellow('▲')}  ${message}`);

const connectExistingRepo = async (projectName: string, repoUrl: string) => {
	const spin = spinner();
	spin.start(`Connecting to ${repoUrl}…`);
	await $`git remote add origin ${`${repoUrl}.git`}`
		.cwd(projectName)
		.quiet()
		.nothrow();
	const push = await $`git push -u origin main`
		.cwd(projectName)
		.quiet()
		.nothrow();
	if (push.exitCode === 0) {
		spin.stop(green(`Pushed to ${repoUrl}`));

		return;
	}
	spin.stop(yellow(`Added remote ${repoUrl}, but the push didn't complete`));
	note('Finish it manually with: git push -u origin main');
};

const createGithubRepo = async (
	projectName: string,
	visibility: 'public' | 'private',
	repoUrl: string | undefined
) => {
	const repoName = basename(projectName);
	const label = repoUrl ?? repoName;
	const visibilityFlag = visibility === 'public' ? '--public' : '--private';
	const spin = spinner();
	spin.start(`Creating ${visibility} repository ${label} on GitHub…`);
	const res =
		await $`gh repo create ${repoName} ${visibilityFlag} --source=. --remote=origin --push`
			.cwd(projectName)
			.quiet()
			.nothrow();
	if (res.exitCode === 0) {
		spin.stop(green(`Created and pushed ${label}`));

		return;
	}
	spin.stop(red('Failed to create the GitHub repository'));
	note(res.stderr.toString().trim() || 'gh repo create failed');
	note(
		'Create it manually, then: git remote add origin <url> && git push -u origin main'
	);
};

export const initializeGit = async ({
	projectName,
	githubLink,
	githubRepoUrl,
	githubVisibility
}: InitializeGitProps) => {
	const spin = spinner();

	try {
		spin.start('Initializing git repository…');

		await $`git init -b main`.cwd(projectName).quiet();
		await $`git add -A`.cwd(projectName).quiet();
		await $`git commit -m "Initial commit"`.cwd(projectName).quiet();

		spin.stop(green('Git repo initialized'));
	} catch (err) {
		spin.cancel(red('Failed to initialize git'));
		throw err;
	}

	if (githubLink === 'existing' && githubRepoUrl) {
		await connectExistingRepo(projectName, githubRepoUrl);
	} else if (githubLink === 'create' && githubVisibility) {
		await createGithubRepo(projectName, githubVisibility, githubRepoUrl);
	}
};
