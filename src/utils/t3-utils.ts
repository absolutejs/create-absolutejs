import { env } from 'node:process';

/**
 * @author Adapted from the create-t3-app project
 * @see https://github.com/t3-oss/create-t3-app
 * @license MIT
 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * @author Adapted from the create-t3-app project
 * @see https://github.com/t3-oss/create-t3-app
 * @license MIT
 */
export const getUserPackageManager: () => PackageManager = () => {
	// This environment variable is set by npm and yarn but pnpm seems less consistent
	const userAgent = env.npm_config_user_agent;

	if (userAgent) {
		if (userAgent.startsWith('yarn')) {
			return 'yarn';
		} else if (userAgent.startsWith('pnpm')) {
			return 'pnpm';
		} else if (userAgent.startsWith('bun')) {
			return 'bun';
		}

		return 'npm';
	}

	// If no user agent is set, assume npm
	return 'npm';
};
