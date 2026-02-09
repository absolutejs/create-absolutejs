import { exit } from 'process';
import { cancel } from '@clack/prompts';

/* eslint-disable */
export function abort(): never {
	cancel('Operation cancelled');
	exit(0);
}
/* eslint-enable */
