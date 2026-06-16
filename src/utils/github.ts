import { platform } from 'process';
import { $ } from 'bun';

/** The authenticated GitHub login, or undefined when it can't be resolved. */
export const getGhLogin = async () => {
	const res = await $`gh api user --jq .login`.quiet().nothrow();
	if (res.exitCode !== 0) return undefined;

	return res.stdout.toString().trim() || undefined;
};

/** True when the GitHub CLI (`gh`) is on the PATH. */
export const hasGh = async () =>
	(platform === 'win32'
		? await $`where gh`.quiet().nothrow()
		: await $`command -v gh`.quiet().nothrow()
	).exitCode === 0;

/** True when `gh` has an authenticated account. */
export const isGhAuthenticated = async () =>
	(await $`gh auth status`.quiet().nothrow()).exitCode === 0;

/**
 * Accepts `owner/name`, `https://github.com/owner/name(.git)`, or
 * `git@github.com:owner/name(.git)` and returns a normalized https URL plus
 * the parsed owner/name. Returns undefined when the input isn't recognizable.
 */
export const normalizeRepoInput = (input: string | undefined) => {
	const trimmed = (input ?? '').trim().replace(/\.git$/, '');
	const patterns = [
		/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/i,
		/^git@github\.com:([^/\s]+)\/([^/\s]+)$/i,
		/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/
	];
	for (const pattern of patterns) {
		const match = trimmed.match(pattern);
		const owner = match?.[1];
		const name = match?.[2];
		if (owner && name) {
			return {
				httpsUrl: `https://github.com/${owner}/${name}`,
				name,
				owner
			};
		}
	}

	return undefined;
};
