import { basename } from 'path';
import { isCancel, select, text } from '@clack/prompts';
import { dim, yellow } from 'picocolors';
import type { GithubLinkOption } from '../types';
import { abort } from '../utils/abort';
import {
	getGhLogin,
	hasGh,
	isGhAuthenticated,
	normalizeRepoInput
} from '../utils/github';

export type GithubLinkResult = {
	githubLink: GithubLinkOption;
	githubRepoUrl: string | undefined;
	githubVisibility: 'public' | 'private' | undefined;
};

const SKIP: GithubLinkResult = {
	githubLink: 'skip',
	githubRepoUrl: undefined,
	githubVisibility: undefined
};

const warn = (message: string) =>
	console.log(`${dim('│')}\n${yellow('▲')}  ${message}`);

const linkExistingRepo = async () => {
	const entered = await text({
		message: 'Repository (owner/name or full GitHub URL):',
		placeholder: 'your-org/your-repo',
		validate: (value) =>
			normalizeRepoInput(value)
				? undefined
				: 'Enter owner/name or a github.com URL'
	});
	if (isCancel(entered)) abort();

	const result: GithubLinkResult = {
		githubLink: 'existing',
		githubRepoUrl: normalizeRepoInput(entered)?.httpsUrl,
		githubVisibility: undefined
	};

	return result;
};

const createNewRepo = async (projectName: string) => {
	if (!(await hasGh())) {
		warn(
			'GitHub CLI (gh) not found — skipping GitHub setup. Install it from https://cli.github.com, then push manually.'
		);

		return SKIP;
	}
	if (!(await isGhAuthenticated())) {
		warn(
			'GitHub CLI is not authenticated — run `gh auth login`, then re-run. Skipping GitHub setup.'
		);

		return SKIP;
	}
	const login = await getGhLogin();
	if (!login) {
		warn("Couldn't resolve your GitHub account — skipping GitHub setup.");

		return SKIP;
	}

	const repoName = basename(projectName);
	const visibility = await select({
		message: `Visibility for github.com/${login}/${repoName}:`,
		options: [
			{ label: 'Private', value: 'private' },
			{ label: 'Public', value: 'public' }
		]
	});
	if (isCancel(visibility)) abort();

	const result: GithubLinkResult = {
		githubLink: 'create',
		githubRepoUrl: `https://github.com/${login}/${repoName}`,
		githubVisibility: visibility === 'public' ? 'public' : 'private'
	};

	return result;
};

export const getGithubLink = async (projectName: string) => {
	const choice = await select({
		message: 'Connect this project to GitHub?',
		options: [
			{
				hint: 'set the remote to a repo you already own',
				label: 'Link an existing repository',
				value: 'existing'
			},
			{
				hint: 'create one for you with the GitHub CLI',
				label: 'Create a new repository',
				value: 'create'
			},
			{ label: 'Skip', value: 'skip' }
		]
	});
	if (isCancel(choice)) abort();

	if (choice === 'existing') return linkExistingRepo();
	if (choice === 'create') return createNewRepo(projectName);

	return SKIP;
};
