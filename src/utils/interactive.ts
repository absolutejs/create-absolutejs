import { exit, stdin, stdout } from 'process';

/** True only when a human can actually answer a clack prompt. */
export const interactive = stdin.isTTY === true && stdout.isTTY === true;

/** Headless safety net: without a TTY, a clack prompt blocks forever (the
 *  Studio container spawns this CLI with stdin ignored). Any axis that would
 *  prompt in that state is a missing flag/default — fail loudly instead. */
export const orPrompt = <T>(flagHint: string, ask: () => Promise<T>) => {
	if (!interactive) {
		console.error(
			`create-absolutejs: cannot prompt for ${flagHint} without a TTY. Pass the flag explicitly (or use --skip for defaults).`
		);
		exit(1);
	}

	return ask();
};
